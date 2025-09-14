---
layout: post
title: "Building Multi-Agent Systems with CrewAI: Beyond Single AI Assistants"
date: 2025-04-10
tags: [crewai, multi-agent, ai-orchestration, langchain, automation]
excerpt: "I built my first multi-agent system using CrewAI. Here's what I learned about orchestrating multiple AI agents to solve complex business problems."
author: "Niranjan Agaram"
---

# Building Multi-Agent Systems with CrewAI: Beyond Single AI Assistants

After months of building single-purpose AI tools, I kept running into the same problem: complex business processes require different types of expertise. A single AI agent, no matter how well-prompted, struggles with tasks that require research, analysis, writing, and review.

Enter CrewAI - a framework for orchestrating multiple AI agents that work together like a real team. Here's my journey building a multi-agent system for our hospital's quality improvement process.

## The Problem: Complex Workflows Need Specialized Roles

Our hospital's quality improvement team follows this process:
1. **Research**: Gather data on patient outcomes and industry benchmarks
2. **Analysis**: Identify patterns and root causes of issues
3. **Planning**: Develop improvement strategies and action plans
4. **Review**: Validate plans against regulations and best practices
5. **Communication**: Create reports for different stakeholders

A single AI agent trying to do all this produces mediocre results at each step. But what if we had specialized agents for each role?

## Why CrewAI?

I looked at several multi-agent frameworks:
- **LangGraph**: Powerful but complex, requires deep understanding of graph structures
- **AutoGen**: Microsoft's framework, good but felt heavy for my use case
- **CrewAI**: Simple, intuitive, designed for business workflows

CrewAI won because it thinks in terms of roles, goals, and collaboration - concepts that map naturally to business processes.

## My First Multi-Agent System

### The Team Structure

I designed a 4-agent crew for quality improvement:

```python
from crewai import Agent, Task, Crew
from langchain_openai import ChatOpenAI

# Initialize the LLM
llm = ChatOpenAI(model="gpt-4", temperature=0.1)

# Research Agent
researcher = Agent(
    role="Healthcare Data Researcher",
    goal="Gather comprehensive data on patient outcomes, industry benchmarks, and best practices",
    backstory="""You are an experienced healthcare data analyst with 10 years of experience 
    in quality improvement. You excel at finding relevant data sources, analyzing trends, 
    and identifying key metrics that matter for patient care.""",
    verbose=True,
    allow_delegation=False,
    llm=llm
)

# Analysis Agent
analyst = Agent(
    role="Quality Improvement Analyst", 
    goal="Analyze data to identify root causes and improvement opportunities",
    backstory="""You are a quality improvement specialist with expertise in healthcare 
    analytics, root cause analysis, and process improvement methodologies like Lean and 
    Six Sigma. You excel at finding patterns in complex data.""",
    verbose=True,
    allow_delegation=False,
    llm=llm
)

# Strategy Agent
strategist = Agent(
    role="Improvement Strategy Planner",
    goal="Develop actionable improvement plans based on analysis findings",
    backstory="""You are a healthcare operations consultant with experience implementing 
    quality improvement initiatives. You understand the practical challenges of healthcare 
    settings and can create realistic, achievable improvement plans.""",
    verbose=True,
    allow_delegation=False,
    llm=llm
)

# Review Agent
reviewer = Agent(
    role="Healthcare Compliance Reviewer",
    goal="Ensure all recommendations comply with healthcare regulations and best practices",
    backstory="""You are a healthcare compliance expert with deep knowledge of HIPAA, 
    Joint Commission standards, and CMS requirements. You ensure all improvement plans 
    meet regulatory requirements and industry standards.""",
    verbose=True,
    allow_delegation=False,
    llm=llm
)
```

### Defining the Tasks

Each agent gets specific tasks that build on each other:

```python
# Research Task
research_task = Task(
    description="""Research the current state of {quality_metric} in our hospital compared 
    to industry benchmarks. Gather data on:
    1. Our current performance metrics
    2. Industry benchmarks and best performers
    3. Evidence-based improvement strategies
    4. Regulatory requirements and standards
    
    Focus on actionable insights that can drive improvement.""",
    agent=researcher,
    expected_output="Comprehensive research report with data, benchmarks, and improvement opportunities"
)

# Analysis Task
analysis_task = Task(
    description="""Analyze the research findings to identify:
    1. Root causes of performance gaps
    2. Priority areas for improvement
    3. Potential barriers to improvement
    4. Success factors from high-performing organizations
    
    Use structured problem-solving methodologies to ensure thorough analysis.""",
    agent=analyst,
    expected_output="Detailed analysis report with root causes and improvement priorities"
)

# Strategy Task
strategy_task = Task(
    description="""Based on the research and analysis, develop a comprehensive improvement plan:
    1. Specific, measurable improvement goals
    2. Detailed action steps with timelines
    3. Resource requirements and responsibilities
    4. Success metrics and monitoring approach
    
    Ensure the plan is realistic and achievable within our hospital's constraints.""",
    agent=strategist,
    expected_output="Complete improvement strategy with actionable plans and success metrics"
)

# Review Task
review_task = Task(
    description="""Review the improvement strategy for:
    1. Compliance with healthcare regulations
    2. Alignment with industry best practices
    3. Risk assessment and mitigation
    4. Feasibility and resource requirements
    
    Provide specific recommendations for any needed adjustments.""",
    agent=reviewer,
    expected_output="Compliance review with recommendations and final approved strategy"
)
```

### Orchestrating the Crew

```python
# Create the crew
quality_improvement_crew = Crew(
    agents=[researcher, analyst, strategist, reviewer],
    tasks=[research_task, analysis_task, strategy_task, review_task],
    verbose=2,  # Enable detailed logging
    process="sequential"  # Tasks execute in order
)

# Execute the workflow
result = quality_improvement_crew.kickoff(inputs={
    "quality_metric": "30-day readmission rates for heart failure patients"
})

print(result)
```

## What Happened (The Good and The Challenging)

### The Good: Specialized Expertise

Each agent brought focused expertise to their role:

**Researcher** found relevant studies, benchmarks, and regulatory guidelines I hadn't considered.

**Analyst** used structured frameworks (like fishbone diagrams) to identify root causes systematically.

**Strategist** created detailed implementation plans with realistic timelines and resource estimates.

**Reviewer** caught compliance issues and suggested risk mitigation strategies.

The final output was significantly more comprehensive than what any single agent could produce.

### The Challenging: Coordination Overhead

**Information Loss**: Sometimes important details from the research phase didn't make it to the strategy phase.

**Inconsistent Quality**: Different agents had varying output quality depending on the complexity of their tasks.

**Processing Time**: The sequential process took 15-20 minutes for complex quality improvement plans.

## Iteration 2: Improving Agent Collaboration

### Adding Memory and Context Sharing

```python
from crewai.memory import LongTermMemory

# Enhanced agents with shared memory
researcher = Agent(
    role="Healthcare Data Researcher",
    goal="Gather comprehensive data on patient outcomes and benchmarks",
    backstory="""...""",
    memory=LongTermMemory(),
    verbose=True,
    llm=llm
)

# Add context sharing between tasks
analysis_task = Task(
    description="""Using the research findings from the previous task, analyze:
    
    Key research findings to consider:
    {research_findings}
    
    Perform detailed analysis to identify...""",
    agent=analyst,
    context=[research_task],  # Access to previous task output
    expected_output="Analysis report building on research findings"
)
```

### Adding Quality Control

```python
# Quality Control Agent
quality_controller = Agent(
    role="Quality Control Specialist",
    goal="Ensure all outputs meet high standards and are internally consistent",
    backstory="""You are a meticulous quality control specialist who reviews all work 
    for accuracy, completeness, and consistency. You catch errors and gaps that others miss.""",
    verbose=True,
    llm=llm
)

# Quality check task
quality_check_task = Task(
    description="""Review all previous outputs for:
    1. Internal consistency across all reports
    2. Completeness of analysis and recommendations
    3. Clarity and actionability of the final strategy
    4. Identification of any gaps or contradictions
    
    Provide specific feedback for improvements.""",
    agent=quality_controller,
    context=[research_task, analysis_task, strategy_task, review_task],
    expected_output="Quality assessment with specific improvement recommendations"
)
```

## Advanced Multi-Agent Patterns

### 1. Hierarchical Teams

```python
# Senior Consultant (Supervisor Agent)
senior_consultant = Agent(
    role="Senior Healthcare Consultant",
    goal="Oversee the quality improvement process and ensure strategic alignment",
    backstory="""You are a senior consultant with 20 years of healthcare experience. 
    You guide teams, make strategic decisions, and ensure all work aligns with 
    organizational goals.""",
    verbose=True,
    allow_delegation=True,  # Can delegate to other agents
    llm=llm
)

# Delegation task
oversight_task = Task(
    description="""Oversee the entire quality improvement process:
    1. Review and approve the research scope
    2. Guide the analysis to focus on strategic priorities
    3. Ensure the improvement strategy aligns with hospital goals
    4. Make final decisions on resource allocation
    
    Delegate specific tasks to team members as needed.""",
    agent=senior_consultant,
    expected_output="Strategic oversight report with final recommendations"
)
```

### 2. Collaborative Problem Solving

```python
# Brainstorming session with multiple agents
brainstorm_task = Task(
    description="""Collaborate to brainstorm innovative solutions for {problem}.
    
    Each agent should contribute ideas from their expertise area:
    - Researcher: Evidence-based solutions from literature
    - Analyst: Data-driven approaches and metrics
    - Strategist: Implementation strategies and change management
    - Reviewer: Compliance considerations and risk factors
    
    Build on each other's ideas to develop comprehensive solutions.""",
    agent=researcher,  # Lead agent
    context=[],
    expected_output="Collaborative brainstorming report with innovative solutions"
)
```

### 3. Iterative Refinement

```python
# Multi-round improvement process
def iterative_improvement(initial_problem, max_iterations=3):
    current_solution = initial_problem
    
    for iteration in range(max_iterations):
        # Analysis round
        analysis_crew = Crew(
            agents=[researcher, analyst],
            tasks=[research_task, analysis_task],
            process="sequential"
        )
        
        analysis_result = analysis_crew.kickoff(inputs={"problem": current_solution})
        
        # Strategy round
        strategy_crew = Crew(
            agents=[strategist, reviewer],
            tasks=[strategy_task, review_task],
            process="sequential"
        )
        
        strategy_result = strategy_crew.kickoff(inputs={"analysis": analysis_result})
        
        # Refinement round
        if iteration < max_iterations - 1:
            current_solution = refine_solution(strategy_result)
    
    return strategy_result
```

## Real-World Application: Patient Flow Optimization

I deployed this system to optimize patient flow in our emergency department:

```python
# Specialized agents for patient flow
flow_researcher = Agent(
    role="Emergency Department Operations Researcher",
    goal="Research best practices for ED patient flow optimization",
    backstory="Expert in emergency medicine operations and patient flow analytics",
    llm=llm
)

flow_analyst = Agent(
    role="Patient Flow Data Analyst", 
    goal="Analyze current ED metrics and identify bottlenecks",
    backstory="Specialist in healthcare operations analytics and process improvement",
    llm=llm
)

flow_strategist = Agent(
    role="ED Operations Strategist",
    goal="Design improved patient flow processes",
    backstory="Expert in emergency department operations and change management",
    llm=llm
)

# Custom tools for data access
from crewai_tools import tool

@tool("ED Metrics Database")
def get_ed_metrics(query: str) -> str:
    """Access emergency department performance metrics"""
    # Connect to hospital database and retrieve metrics
    return fetch_ed_data(query)

@tool("Staffing Schedule System")
def get_staffing_data(date_range: str) -> str:
    """Access staffing schedules and patterns"""
    return fetch_staffing_data(date_range)

# Assign tools to agents
flow_analyst.tools = [get_ed_metrics, get_staffing_data]
```

**Results**:
- **Comprehensive analysis** of 15 different bottleneck factors
- **Detailed improvement plan** with 8 specific interventions
- **Implementation timeline** spanning 6 months with clear milestones
- **ROI projections** showing potential 25% reduction in wait times

## Lessons Learned

### 1. Agent Design Matters

**Good agents have**:
- Clear, specific roles
- Detailed backstories that shape their perspective
- Appropriate tools for their tasks
- Well-defined goals and success criteria

**Poor agents**:
- Try to do everything
- Have vague or conflicting goals
- Lack domain-specific knowledge
- Don't collaborate effectively

### 2. Task Sequencing is Critical

The order of tasks significantly affects output quality. I learned to:
- Start with broad research, then narrow to specific analysis
- Build context progressively through the workflow
- Include validation and review steps
- Allow for iteration and refinement

### 3. Context Management is Hard

Ensuring agents have the right information at the right time requires careful design:
- Use task context to pass information between agents
- Implement shared memory for long-running processes
- Create summary tasks to distill key information
- Monitor for information loss between steps

## Current Production Setup

### Streamlit Interface

```python
import streamlit as st
from crewai import Crew

st.title("Healthcare Quality Improvement Assistant")

problem_area = st.selectbox(
    "Select improvement area:",
    ["Patient Safety", "Readmission Rates", "Patient Satisfaction", "Operational Efficiency"]
)

specific_metric = st.text_input("Specific metric or issue:")

if st.button("Generate Improvement Plan"):
    with st.spinner("AI team is working on your improvement plan..."):
        # Show progress of each agent
        progress_bar = st.progress(0)
        status_text = st.empty()
        
        # Execute crew with progress tracking
        crew = create_quality_improvement_crew()
        result = crew.kickoff(inputs={
            "quality_metric": f"{problem_area}: {specific_metric}"
        })
        
        st.success("Improvement plan completed!")
        st.write(result)
```

### Integration with Hospital Systems

```python
class HospitalQualityCrewAI:
    def __init__(self):
        self.crew = self.setup_crew()
        self.database = HospitalDatabase()
        self.notification_system = NotificationSystem()
    
    def run_quality_analysis(self, metric, department):
        # Get real hospital data
        current_data = self.database.get_quality_metrics(metric, department)
        
        # Run crew analysis
        result = self.crew.kickoff(inputs={
            "quality_metric": metric,
            "department": department,
            "current_data": current_data
        })
        
        # Store results and notify stakeholders
        self.database.store_improvement_plan(result)
        self.notification_system.notify_quality_team(result)
        
        return result
```

## Performance and Costs

**Processing Time**: 10-15 minutes for comprehensive improvement plans
**Cost per Analysis**: ~$3-5 in API calls (GPT-4)
**Accuracy**: 90% of recommendations deemed actionable by clinical staff
**User Satisfaction**: 85% prefer multi-agent output over single-agent responses

## What's Next

I'm exploring:
1. **Dynamic team composition**: Automatically selecting agents based on problem type
2. **Human-in-the-loop workflows**: Allowing experts to guide agent decisions
3. **Continuous learning**: Agents that improve based on feedback
4. **Cross-domain applications**: Using similar patterns for other business processes

## Key Takeaways

1. **Multi-agent systems excel at complex, multi-step problems** that require different types of expertise
2. **Agent design and task sequencing are more important than the underlying LLM**
3. **Context management and information flow require careful planning**
4. **The overhead is worth it for complex business processes**
5. **Users prefer specialized expertise over generalist responses**

CrewAI has transformed how I approach complex business problems. Instead of trying to create one super-agent, I now think about assembling teams of specialized agents that collaborate like human experts.

---

*Next post: I'm experimenting with voice AI integration using Streamlit and speech-to-text. Can we make multi-agent systems conversational?*