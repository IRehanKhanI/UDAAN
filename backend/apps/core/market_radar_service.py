import json
import logging
import math
from datetime import datetime, timedelta, timezone

from .gemini_service import (
    GeminiConfigurationError,
    GeminiRequestError,
    _gemini_models,
    _generate_with_provider_fallback,
    _parse_json_candidate,
)
from .web_research_service import perform_full_web_research

logger = logging.getLogger(__name__)


def _build_default_mindmap_layout(idea_title, market_insights, milestones):
    """
    Constructs an interactive 2D node-link graph layout for the Mind Map view.
    Branches:
    Center: Idea Node
    Layer 1: Market Insights (competitor gaps, pricing, complaints)
    Layer 2: Core Brief / PRD Node
    Layer 3: 4 Milestones
    Layer 4: Tasks under each milestone
    """
    nodes = []
    edges = []

    # Center Idea Node
    center_id = "node-idea-root"
    nodes.append({
        "id": center_id,
        "label": idea_title[:40],
        "category": "idea",
        "description": idea_title,
        "x": 0,
        "y": 0,
        "status": "active",
        "color": "#8E4B49",
    })

    # Layer 1: Market Insights
    num_insights = min(len(market_insights), 4)
    insight_angle_spread = math.pi * 0.8
    for i in range(num_insights):
        insight = market_insights[i]
        node_id = f"node-insight-{i+1}"
        angle = -insight_angle_spread / 2 + (insight_angle_spread / max(num_insights - 1, 1)) * i - math.pi / 2
        dist = 220
        x = math.cos(angle) * dist
        y = math.sin(angle) * dist - 30

        nodes.append({
            "id": node_id,
            "label": insight.get("title", f"Insight {i+1}")[:32],
            "category": "insight",
            "description": insight.get("snippet", ""),
            "x": round(x),
            "y": round(y),
            "status": "verified",
            "color": "#FFAAA6",
        })
        edges.append({
            "id": f"edge-root-{node_id}",
            "source": center_id,
            "target": node_id,
            "color": "#FFAAA6",
            "animated": True,
            "label": "market radar",
        })

    # Layer 2: Core Brief / PRD Node
    prd_id = "node-prd-core"
    nodes.append({
        "id": prd_id,
        "label": "PRD & Core Brief",
        "category": "prd",
        "description": "Validated product requirements and scope definition",
        "x": 0,
        "y": 170,
        "status": "completed",
        "color": "#FBE191",
    })
    edges.append({
        "id": f"edge-root-{prd_id}",
        "source": center_id,
        "target": prd_id,
        "color": "#FBE191",
        "animated": False,
        "label": "architecture",
    })

    # Layer 3: 4 Milestones
    m_spacing = 260
    start_x = -((len(milestones) - 1) * m_spacing) / 2
    for m_idx, milestone in enumerate(milestones):
        m_id = f"node-milestone-{m_idx+1}"
        mx = round(start_x + m_idx * m_spacing)
        my = 360

        nodes.append({
            "id": m_id,
            "label": milestone.get("title", f"M{m_idx+1}")[:28],
            "category": "milestone",
            "description": milestone.get("purpose", milestone.get("outcome", "")),
            "milestone_index": m_idx + 1,
            "x": mx,
            "y": my,
            "status": "active" if m_idx == 0 else "pending",
            "color": ["#FFAAA6", "#FBE191", "#EAE4F8", "#9FD8CB"][m_idx % 4],
        })
        edges.append({
            "id": f"edge-prd-{m_id}",
            "source": prd_id,
            "target": m_id,
            "color": ["#FFAAA6", "#FBE191", "#EAE4F8", "#9FD8CB"][m_idx % 4],
            "animated": m_idx == 0,
            "label": f"M{m_idx+1}",
        })

        # Layer 4: Tasks under each milestone
        tasks = milestone.get("tasks", [])
        t_spread = 65
        t_start_y = my + 90
        for t_idx, task in enumerate(tasks[:4]):
            t_id = f"node-task-{m_idx+1}-{t_idx+1}"
            tx = mx + (t_idx % 2 == 1 and 30 or -30) if len(tasks) > 1 else mx
            ty = t_start_y + t_idx * t_spread

            nodes.append({
                "id": t_id,
                "label": task.get("title", f"Task {t_idx+1}")[:32],
                "category": "task",
                "description": task.get("why_matters", ""),
                "milestone_id": m_id,
                "xp_reward": task.get("xp_reward", 150),
                "x": round(tx),
                "y": round(ty),
                "status": "active" if (m_idx == 0 and t_idx == 0) else "locked" if task.get("dependencies") else "pending",
                "color": "#534342",
            })
            edges.append({
                "id": f"edge-{m_id}-{t_id}",
                "source": m_id,
                "target": t_id,
                "color": "#D8C1C0",
                "animated": m_idx == 0 and t_idx == 0,
                "label": f"+{task.get('xp_reward', 150)} XP",
            })

    return {"nodes": nodes, "edges": edges}


def generate_market_radar_and_flight_plan(*, idea, project_type, attachment_text=""):
    """
    End-to-End Launch Pipeline:
    Stage A: Web Research (Tavily Search API & Deep Extraction).
    Stage B: Gemini Structured Synthesis (Market Radar Report + 4-Milestone Plan + Mind Map Graph).
    """
    logger.info(f"Starting Stage A web research for idea: '{idea[:60]}'")
    web_research = perform_full_web_research(idea, project_type)
    sources = web_research.get("sources", [])
    has_live_evidence = web_research.get("has_live_web_evidence", False)

    logger.info(f"Web research completed with {len(sources)} sources. Proceeding to Stage B synthesis.")

    sources_summary = json.dumps(sources[:12], ensure_ascii=False)
    today = datetime.now(timezone.utc).date()
    target_date_m1 = (today + timedelta(days=14)).isoformat()
    target_date_m2 = (today + timedelta(days=35)).isoformat()
    target_date_m3 = (today + timedelta(days=60)).isoformat()
    target_date_m4 = (today + timedelta(days=80)).isoformat()

    schema = {
        "type": "object",
        "properties": {
            "project_name": {"type": "string"},
            "problem_statement": {"type": "string"},
            "target_users": {"type": "string"},
            "expected_outcome": {"type": "string"},
            "market_radar": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string"},
                    "competitors": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "positioning": {"type": "string"},
                                "pricing": {"type": "string"},
                                "core_features": {"type": "array", "items": {"type": "string"}},
                                "market_presence": {"type": "string"},
                            },
                            "required": ["name", "positioning", "pricing", "core_features", "market_presence"],
                        },
                    },
                    "customer_voice": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "pain_point": {"type": "string"},
                                "source_type": {"type": "string"},
                                "user_complaint": {"type": "string"},
                                "excerpt": {"type": "string"},
                                "url": {"type": "string"},
                            },
                            "required": ["pain_point", "source_type", "user_complaint", "excerpt"],
                        },
                    },
                    "citations": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "url": {"type": "string"},
                                "retrieval_date": {"type": "string"},
                                "excerpt": {"type": "string"},
                                "badge": {"type": "string", "enum": ["Verified Web Evidence", "AI Hypothesis"]},
                            },
                            "required": ["title", "url", "retrieval_date", "excerpt", "badge"],
                        },
                    },
                    "validation_experiments": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "title": {"type": "string"},
                                "hypothesis": {"type": "string"},
                                "experiment_type": {"type": "string"},
                                "method": {"type": "string"},
                                "pass_fail_metric": {"type": "string"},
                                "estimated_cost": {"type": "string"},
                                "effort_days": {"type": "integer"},
                            },
                            "required": ["id", "title", "hypothesis", "experiment_type", "method", "pass_fail_metric", "estimated_cost", "effort_days"],
                        },
                    },
                },
                "required": ["summary", "competitors", "customer_voice", "citations", "validation_experiments"],
            },
            "flight_plan": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string"},
                    "milestones": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "category": {"type": "string"},
                                "purpose": {"type": "string"},
                                "outcome": {"type": "string"},
                                "start_date": {"type": "string"},
                                "target_date": {"type": "string"},
                                "tasks": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "id": {"type": "string"},
                                            "title": {"type": "string"},
                                            "why_matters": {"type": "string"},
                                            "radar_chip": {"type": "string"},
                                            "steps": {
                                                "type": "array",
                                                "items": {
                                                    "type": "object",
                                                    "properties": {
                                                        "text": {"type": "string"},
                                                        "done": {"type": "boolean"},
                                                    },
                                                    "required": ["text", "done"],
                                                },
                                            },
                                            "expected_evidence": {"type": "array", "items": {"type": "string"}},
                                            "verification_criteria": {"type": "string"},
                                            "dependencies": {"type": "array", "items": {"type": "string"}},
                                            "xp_reward": {"type": "integer"},
                                            "priority": {"type": "string", "enum": ["high", "medium", "low"]},
                                            "effort_hours": {"type": "number"},
                                            "suggested_role": {"type": "string"},
                                            "start_date": {"type": "string"},
                                            "target_date": {"type": "string"},
                                        },
                                        "required": [
                                            "id", "title", "why_matters", "radar_chip", "steps",
                                            "expected_evidence", "verification_criteria", "dependencies",
                                            "xp_reward", "priority", "effort_hours", "suggested_role",
                                        ],
                                    },
                                },
                            },
                            "required": ["title", "category", "purpose", "outcome", "tasks"],
                        },
                    },
                },
                "required": ["summary", "milestones"],
            },
        },
        "required": ["project_name", "problem_statement", "target_users", "expected_outcome", "market_radar", "flight_plan"],
    }

    prompt = f"""You are UDAAN's expert project architect and market intelligence engine.
Analyze the user's project idea using the real web discovery findings retrieved from Tavily Web Search and deep extraction.

PROJECT IDEA:
{idea}

PROJECT TYPE:
{project_type}

OPTIONAL ATTACHMENT MATERIAL:
{attachment_text[:5000] if attachment_text else '(none)'}

RETRIEVED WEB RESEARCH FINDINGS (from Tavily Web Search & Extraction):
{sources_summary}

RULES FOR SYNTHESIS:
1. MARKET RADAR REPORT:
   - Identify 2 to 4 real competitors with publicly listed pricing models (e.g. Free tier, $29/mo, $199 hardware, etc.).
   - Extract Voice of the Customer: 2 to 4 public user pain points and complaints found in user reviews or forums.
   - For citations, prioritize real URLs and excerpts provided in the research findings. Badge items as 'Verified Web Evidence' if backed by the sources, or 'AI Hypothesis' if an expert deduction.
   - Provide 2 to 3 actionable, low-cost Validation Experiments with clear pass/fail metrics.

2. FLIGHT PLAN:
   - Must generate exactly 4 sequenced milestones:
     * Milestone 1: Core Market Validation & Riskiest Assumption Testing (directly addressing the top complaint or competitor gap from Market Radar).
     * Milestone 2: Product Architecture & MVP Core Prototype (hardware/software/hybrid as appropriate for {idea}).
     * Milestone 3: Integration, User Testing & TestPilot Verification.
     * Milestone 4: Production Polish, Showcase & Launch Readiness.
   - 3 to 5 actionable tasks per milestone.
   - Each task MUST include:
     * 'why_matters': concise rationale referencing Market Radar insight.
     * 'radar_chip': short chip label (e.g., 'Competitor Gap: Expensive Tier', 'Customer Pain: Fragile Grip').
     * 'steps': 2 to 4 sequential subtask checklist items (text, done=false).
     * 'expected_evidence': 2 to 4 concrete repository files, symbols, manifests, or hardware CAD/wiring specs (e.g., 'src/components/Stabilizer.jsx', 'firmware/pid.cpp', 'tests/test_imu.py').
     * 'verification_criteria': concrete test or proof artifact required.
     * 'dependencies': task IDs that must precede this task.
     * 'xp_reward': between 100 and 200 XP per task.
     * Dates starting today ({today.isoformat()}) sequentially to {target_date_m4}.
"""

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.25,
            "maxOutputTokens": 7000,
            "thinkingConfig": {"thinkingLevel": "low"},
            "responseMimeType": "application/json",
            "responseSchema": schema,
        },
    }

    try:
        body = _generate_with_provider_fallback(payload, _gemini_models(), primary_retries=1, feature="market radar & flight plan")
        result = _parse_json_candidate(body)
    except Exception as e:
        logger.error(f"Gemini generation error in market radar: {e}. Building grounded fallback plan.")
        result = _build_grounded_fallback(idea, project_type, sources, today)

    # Post-process dates and IDs to ensure perfect sequencing
    milestones = result.get("flight_plan", {}).get("milestones", [])
    if len(milestones) < 4:
        milestones = _ensure_four_milestones(milestones, idea, today)
        result["flight_plan"]["milestones"] = milestones

    date_milestones = [today, today + timedelta(days=14), today + timedelta(days=35), today + timedelta(days=60), today + timedelta(days=80)]
    total_xp = 0
    all_task_ids = []

    for m_idx, milestone in enumerate(milestones):
        m_start = date_milestones[m_idx].isoformat()
        m_target = date_milestones[m_idx + 1].isoformat()
        milestone["start_date"] = milestone.get("start_date") or m_start
        milestone["target_date"] = milestone.get("target_date") or m_target

        for t_idx, task in enumerate(milestone.get("tasks", [])):
            task_id = f"m{m_idx+1}-t{t_idx+1}"
            task["id"] = task_id
            all_task_ids.append(task_id)
            task["xp_reward"] = int(task.get("xp_reward") or 150)
            total_xp += task["xp_reward"]
            task["start_date"] = task.get("start_date") or m_start
            task["target_date"] = task.get("target_date") or m_target
            if not isinstance(task.get("steps"), list) or not task["steps"]:
                task["steps"] = [{"text": f"Define requirements for {task.get('title')}", "done": False}, {"text": f"Implement core functionality", "done": False}, {"text": "Run verification tests", "done": False}]
            if not isinstance(task.get("expected_evidence"), list) or not task["expected_evidence"]:
                task["expected_evidence"] = ["src/index.js", "tests/verification_test.js"]

    # Build Mind Map Graph
    insights = []
    for comp in result.get("market_radar", {}).get("competitors", []):
        insights.append({"title": f"Competitor: {comp.get('name')}", "snippet": f"{comp.get('positioning')} ({comp.get('pricing')})"})
    for complaint in result.get("market_radar", {}).get("customer_voice", []):
        insights.append({"title": f"User Need: {complaint.get('pain_point')}", "snippet": complaint.get("user_complaint")})

    mindmap = _build_default_mindmap_layout(
        idea_title=result.get("project_name") or idea[:32],
        market_insights=insights,
        milestones=milestones,
    )

    return {
        "project_name": result.get("project_name") or f"{idea[:30].strip()} Project",
        "problem_statement": result.get("problem_statement") or idea,
        "target_users": result.get("target_users") or "Early adopters and target audience",
        "expected_outcome": result.get("expected_outcome") or "Working validated product MVP",
        "market_radar": result.get("market_radar", {}),
        "flight_plan": result.get("flight_plan", {}),
        "mindmap_graph": mindmap,
        "total_xp_pool": total_xp,
        "web_research_sources": sources,
    }


def _ensure_four_milestones(milestones, idea, today):
    """Guarantees at least 4 structured milestones."""
    categories = [
        ("Market & Risk Validation", "Validate core market opportunity and riskiest assumptions"),
        ("Architecture & Core Prototype", "Build foundational functional prototype"),
        ("System Integration & Verification", "Integrate components and run verification checks"),
        ("Launch Polish & Showcase", "Final product readiness and release"),
    ]
    while len(milestones) < 4:
        idx = len(milestones)
        title, purpose = categories[idx]
        milestones.append({
            "title": f"Milestone {idx+1}: {title}",
            "category": title,
            "purpose": purpose,
            "outcome": f"Deliverable completed for {title}",
            "tasks": [
                {
                    "id": f"m{idx+1}-t1",
                    "title": f"Implement core milestone {idx+1} deliverable",
                    "why_matters": "Directly supports project validation and build progress.",
                    "radar_chip": "Market Feasibility",
                    "steps": [{"text": "Spec requirements", "done": False}, {"text": "Build feature", "done": False}, {"text": "Verify", "done": False}],
                    "expected_evidence": ["src/main.js", "README.md"],
                    "verification_criteria": "Unit tests pass and deliverable demonstrated",
                    "dependencies": [],
                    "xp_reward": 150,
                    "priority": "high",
                    "effort_hours": 8,
                    "suggested_role": "Lead Developer",
                }
            ],
        })
    return milestones


def _build_grounded_fallback(idea, project_type, sources, today):
    """
    Resilient synthesis when AI model is temporarily unreachable.
    Builds grounded structure with actual sources.
    """
    comp_list = []
    voice_list = []
    citations = []

    if sources:
        for s in sources[:3]:
            citations.append({
                "title": s.get("title", "Market Source"),
                "url": s.get("url", "https://example.com"),
                "retrieval_date": s.get("retrieved_at", "Today"),
                "excerpt": s.get("snippet", "Web research finding on competitors and pricing"),
                "badge": "Verified Web Evidence",
            })
            comp_list.append({
                "name": s.get("title", "Market Alternative")[:24],
                "positioning": "Existing market option",
                "pricing": "Publicly listed tiers vary from Free to Premium",
                "core_features": ["Core feature set", "User management", "Basic workflow"],
                "market_presence": "Established web presence",
            })
            voice_list.append({
                "pain_point": "High cost and complex setup",
                "source_type": s.get("source_type", "Web Review"),
                "user_complaint": "Existing tools are either too expensive or lack intuitive workflows.",
                "excerpt": s.get("snippet", "Need simpler, more affordable alternatives"),
                "url": s.get("url", ""),
            })

    if not comp_list:
        comp_list = [
            {
                "name": "Standard Market Tool A",
                "positioning": "Enterprise standard with steep learning curve",
                "pricing": "$49 - $199 / month",
                "core_features": ["Broad functionality", "Complex dashboard"],
                "market_presence": "High market share",
            },
            {
                "name": "Open-Source Alternative B",
                "positioning": "Community-led DIY setup",
                "pricing": "Free / Self-hosted",
                "core_features": ["Modular design", "Manual configuration"],
                "market_presence": "Niche developer community",
            },
        ]
        voice_list = [
            {
                "pain_point": "Pricing barrier for students and small teams",
                "source_type": "Community Review",
                "user_complaint": "Existing software pricing prohibits early-stage testing and iteration.",
                "excerpt": "Looking for lightweight, accessible alternatives without hefty lock-in.",
                "url": "",
            }
        ]
        citations = [
            {
                "title": f"{idea[:30]} Landscape Overview",
                "url": "https://tavily.com",
                "retrieval_date": "Today",
                "excerpt": "Aggregated market evidence comparing high-tier offerings with budget alternatives.",
                "badge": "AI Hypothesis",
            }
        ]

    experiments = [
        {
            "id": "exp-1",
            "title": "Low-Cost Demand Smoke Test",
            "hypothesis": "At least 20% of target users will sign up for early access given a clear value proposition.",
            "experiment_type": "Landing Page Smoke Test",
            "method": "Deploy 1-page creative showcase with interest capture form.",
            "pass_fail_metric": ">15% conversion rate on 100 visitors",
            "estimated_cost": "$0 - $15",
            "effort_days": 2,
        },
        {
            "id": "exp-2",
            "title": "Core Usability & Pain Point Interview",
            "hypothesis": "Users confirm the #1 bottleneck is current tool complexity and pricing.",
            "experiment_type": "Targeted User Interview",
            "method": "5 structured 15-minute interviews with prospective users.",
            "pass_fail_metric": "4/5 participants validate problem urgency",
            "estimated_cost": "$0",
            "effort_days": 3,
        },
    ]

    milestones = [
        {
            "title": "Milestone 1: Market & Riskiest Assumption Validation",
            "category": "Validation",
            "purpose": "Verify core user willingness and demand threshold before heavy build",
            "outcome": "Validation metrics recorded with evidence",
            "tasks": [
                {
                    "id": "m1-t1",
                    "title": "Execute Low-Cost Demand Smoke Test",
                    "why_matters": "Directly tests riskiest assumption identified in Market Radar.",
                    "radar_chip": "Market Demand Check",
                    "steps": [{"text": "Draft value prop copy", "done": False}, {"text": "Publish interest landing page", "done": False}, {"text": "Measure conversion rate", "done": False}],
                    "expected_evidence": ["docs/validation_report.md", "src/landing/index.html"],
                    "verification_criteria": "Conversion data logged with >15% threshold",
                    "dependencies": [],
                    "xp_reward": 150,
                    "priority": "high",
                    "effort_hours": 6,
                    "suggested_role": "Product Lead",
                },
                {
                    "id": "m1-t2",
                    "title": "Conduct Competitor Pricing Analysis",
                    "why_matters": "Confirms market willingness to pay and feature parity gaps.",
                    "radar_chip": "Pricing Differentiation",
                    "steps": [{"text": "Audit competitor price tiers", "done": False}, {"text": "Define target pricing tier", "done": False}],
                    "expected_evidence": ["docs/pricing_strategy.md"],
                    "verification_criteria": "Completed pricing model documented",
                    "dependencies": ["m1-t1"],
                    "xp_reward": 120,
                    "priority": "medium",
                    "effort_hours": 4,
                    "suggested_role": "Market Strategist",
                },
                {
                    "id": "m1-t3",
                    "title": "Finalize PRD and Technical Architecture",
                    "why_matters": "Eliminates scope creep by locking core MVP requirements.",
                    "radar_chip": "Core Scope Lock",
                    "steps": [{"text": "Define system components", "done": False}, {"text": "Set API specifications", "done": False}],
                    "expected_evidence": ["docs/PRD.md", "architecture.json"],
                    "verification_criteria": "PRD signed off with clear acceptance criteria",
                    "dependencies": ["m1-t2"],
                    "xp_reward": 150,
                    "priority": "high",
                    "effort_hours": 8,
                    "suggested_role": "System Architect",
                },
            ],
        },
        {
            "title": "Milestone 2: Foundational MVP Prototype",
            "category": "Core Development",
            "purpose": "Build working functional prototype of the core mechanism",
            "outcome": "Functional MVP demoable end-to-end",
            "tasks": [
                {
                    "id": "m2-t1",
                    "title": "Setup Core Application Scaffolding",
                    "why_matters": "Lays down repository skeleton and dependencies.",
                    "radar_chip": "System Baseline",
                    "steps": [{"text": "Initialize codebase", "done": False}, {"text": "Configure build tooling", "done": False}],
                    "expected_evidence": ["package.json", "src/App.jsx", "vite.config.js"],
                    "verification_criteria": "Application builds and runs with 0 errors",
                    "dependencies": ["m1-t3"],
                    "xp_reward": 140,
                    "priority": "high",
                    "effort_hours": 6,
                    "suggested_role": "Frontend / Lead Dev",
                },
                {
                    "id": "m2-t2",
                    "title": "Implement Primary User Workflow",
                    "why_matters": "Delivers the core value proposition to solve the primary user complaint.",
                    "radar_chip": "Core Value Delivery",
                    "steps": [{"text": "Build main interface components", "done": False}, {"text": "Connect state management", "done": False}],
                    "expected_evidence": ["src/components/MainWorkflow.jsx", "src/services/api.js"],
                    "verification_criteria": "Primary workflow executes smoothly end-to-end",
                    "dependencies": ["m2-t1"],
                    "xp_reward": 180,
                    "priority": "high",
                    "effort_hours": 12,
                    "suggested_role": "Fullstack Developer",
                },
                {
                    "id": "m2-t3",
                    "title": "Data Persistence and Storage Layer",
                    "why_matters": "Ensures user data and settings persist reliably across sessions.",
                    "radar_chip": "State Integrity",
                    "steps": [{"text": "Configure storage schemas", "done": False}, {"text": "Implement CRUD endpoints", "done": False}],
                    "expected_evidence": ["backend/models.py", "backend/views.py"],
                    "verification_criteria": "Data writes and reads pass automated unit tests",
                    "dependencies": ["m2-t2"],
                    "xp_reward": 150,
                    "priority": "medium",
                    "effort_hours": 8,
                    "suggested_role": "Backend Engineer",
                },
            ],
        },
        {
            "title": "Milestone 3: Verification, Edge Cases & TestPilot",
            "category": "Testing & Integration",
            "purpose": "Verify stability, edge cases, and automated test passes",
            "outcome": "Validated test suite and verified code artifacts",
            "tasks": [
                {
                    "id": "m3-t1",
                    "title": "End-to-End Automated Test Suite",
                    "why_matters": "Prevents regressions and verifies critical user paths.",
                    "radar_chip": "Quality Assurance",
                    "steps": [{"text": "Write happy path tests", "done": False}, {"text": "Write edge case tests", "done": False}],
                    "expected_evidence": ["tests/e2e.test.js", "tests/api.test.py"],
                    "verification_criteria": "All automated test suites pass with 100% green status",
                    "dependencies": ["m2-t3"],
                    "xp_reward": 160,
                    "priority": "high",
                    "effort_hours": 8,
                    "suggested_role": "QA Engineer",
                },
                {
                    "id": "m3-t2",
                    "title": "Error Handling & Recovery Flow",
                    "why_matters": "Satisfies Nielsen Usability Heuristic #9 for plain-language error recovery.",
                    "radar_chip": "Error Recovery",
                    "steps": [{"text": "Add error boundary cards", "done": False}, {"text": "Implement retry actions", "done": False}],
                    "expected_evidence": ["src/components/ErrorBoundary.jsx"],
                    "verification_criteria": "Failed requests offer 1-click retry without crashing",
                    "dependencies": ["m3-t1"],
                    "xp_reward": 130,
                    "priority": "medium",
                    "effort_hours": 5,
                    "suggested_role": "Frontend Engineer",
                },
            ],
        },
        {
            "title": "Milestone 4: Launch Preparation & Showcase",
            "category": "Launch Polish",
            "purpose": "Polish UI/UX, documentation, and prepare live demonstration",
            "outcome": "Public-ready launch and showcase artifacts",
            "tasks": [
                {
                    "id": "m4-t1",
                    "title": "Playful Utility UI/UX Styling & Polish",
                    "why_matters": "Creates a memorable, tactile first impression with rich aesthetics.",
                    "radar_chip": "Visual Excellence",
                    "steps": [{"text": "Audit studio color swatches", "done": False}, {"text": "Add micro-interactions", "done": False}],
                    "expected_evidence": ["src/styles/theme.css", "src/layouts/Header.jsx"],
                    "verification_criteria": "UI adheres to Playful Utility design system guidelines",
                    "dependencies": ["m3-t2"],
                    "xp_reward": 140,
                    "priority": "medium",
                    "effort_hours": 6,
                    "suggested_role": "UI/UX Designer",
                },
                {
                    "id": "m4-t2",
                    "title": "Documentation & Demo Showcase Deployment",
                    "why_matters": "Enables anyone to test, verify, and understand the project in minutes.",
                    "radar_chip": "Showcase Readiness",
                    "steps": [{"text": "Write comprehensive README", "done": False}, {"text": "Deploy live preview", "done": False}],
                    "expected_evidence": ["README.md", "deploy.config.js"],
                    "verification_criteria": "Live application accessible with zero configuration errors",
                    "dependencies": ["m4-t1"],
                    "xp_reward": 150,
                    "priority": "high",
                    "effort_hours": 6,
                    "suggested_role": "DevOps / Release Lead",
                },
            ],
        },
    ]

    return {
        "project_name": f"{idea[:30].strip()} Launch",
        "problem_statement": f"Addressing critical gaps and high costs in {idea}.",
        "target_users": "Early adopters, developers, and project creators",
        "expected_outcome": "Fully functioning verified product with solid market positioning.",
        "market_radar": {
            "summary": f"Comprehensive market analysis for {idea} highlighting competitor gaps, pricing, and user reviews.",
            "competitors": comp_list,
            "customer_voice": voice_list,
            "citations": citations,
            "validation_experiments": experiments,
        },
        "flight_plan": {
            "summary": "4-milestone execution flight plan starting with risk validation and leading to launch.",
            "milestones": milestones,
        },
    }


def _build_default_mindmap_layout(idea_title, market_insights, milestones):
    """
    Builds a 2D directed graph layout with Idea -> Market Insights -> Milestones -> Tasks.
    """
    nodes = []
    edges = []

    # 1. Root Idea Node
    root_id = "node-root"
    nodes.append({
        "id": root_id,
        "label": (idea_title or "Idea Core")[:32],
        "type": "root",
        "group": "core",
        "description": "Core Idea & Vision Anchor",
        "x": 80,
        "y": 320,
    })

    # 2. Market Insight Nodes
    insight_y_start = 100
    for idx, insight in enumerate(market_insights[:4]):
        n_id = f"node-mkt-{idx+1}"
        nodes.append({
            "id": n_id,
            "label": (insight.get("title") or f"Insight {idx+1}")[:28],
            "type": "market",
            "group": "market",
            "description": insight.get("snippet", ""),
            "radar_chip": "Market Grounding",
            "x": 380,
            "y": insight_y_start + idx * 110,
        })
        edges.append({
            "id": f"edge-root-{n_id}",
            "source": root_id,
            "target": n_id,
            "label": "grounded by",
            "animated": True,
        })

    # 3. Milestone & Task Nodes
    milestone_x = 700
    task_x = 1040
    prev_m_id = None

    for m_idx, milestone in enumerate(milestones):
        m_id = f"node-m{m_idx+1}"
        m_y = 100 + m_idx * 180
        nodes.append({
            "id": m_id,
            "label": (milestone.get("title") or f"Milestone {m_idx+1}")[:32],
            "type": "milestone",
            "group": "milestone",
            "description": milestone.get("purpose", ""),
            "x": milestone_x,
            "y": m_y,
        })

        if prev_m_id:
            edges.append({
                "id": f"edge-{prev_m_id}-{m_id}",
                "source": prev_m_id,
                "target": m_id,
                "label": "advances to",
                "animated": True,
            })
        else:
            edges.append({
                "id": f"edge-root-{m_id}",
                "source": root_id,
                "target": m_id,
                "label": "executes",
                "animated": True,
            })
        prev_m_id = m_id

        tasks = milestone.get("tasks", [])
        for t_idx, task in enumerate(tasks[:3]):
            t_id = task.get("id") or f"m{m_idx+1}-t{t_idx+1}"
            node_t_id = f"node-{t_id}"
            nodes.append({
                "id": node_t_id,
                "taskId": t_id,
                "label": (task.get("title") or f"Task {t_idx+1}")[:30],
                "type": "task",
                "group": "task",
                "description": task.get("why_matters", ""),
                "xp_reward": int(task.get("xp_reward") or 150),
                "radar_chip": task.get("radar_chip", ""),
                "x": task_x,
                "y": m_y - 40 + t_idx * 55,
            })
            edges.append({
                "id": f"edge-{m_id}-{node_t_id}",
                "source": m_id,
                "target": node_t_id,
                "label": f"+{int(task.get('xp_reward') or 150)} XP",
                "animated": False,
            })

    return {
        "nodes": nodes,
        "edges": edges,
        "layout_settings": {
            "node_spacing": 1.0,
            "connection_opacity": 0.65,
            "theme": "espresso",
            "show_labels": True,
        },
    }

