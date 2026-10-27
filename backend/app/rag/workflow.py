
import re
from typing import TypedDict, List, Dict, Any

from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings
from app.rag.retriever import retrieve_context


# STEP 1: Define workflow state
class SimulationState(TypedDict):
    topic: str
    difficulty: str
    context: str
    sources: List[str]
    generated_content: str
    safety_passed: bool
    status: str
    error: str


# STEP 2: Retrieve cybersecurity knowledge
def retrieve_knowledge(state: SimulationState):

    results = retrieve_context(state["topic"], k=3)

    if not results:
        return {
            "error": "No relevant cybersecurity knowledge found.",
            "safety_passed": False,
            "status": "failed",
        }

    context = "\n\n".join(
        result["content"] for result in results
    )

    sources = list({
        result["source"] for result in results
    })

    print("RAG: Retrieved", len(results), "knowledge chunks.")

    return {
        "context": context,
        "sources": sources,
    }


# STEP 3: Generate simulation using Gemini
def generate_simulation(state: SimulationState):

    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.4,
    )

    prompt = f"""
You are a cybersecurity awareness training assistant.

Create a safe educational phishing simulation draft.

TOPIC:
{state["topic"]}

DIFFICULTY:
{state["difficulty"]}

RETRIEVED KNOWLEDGE:
{state["context"]}


RULES:

1. Use retrieved cybersecurity knowledge as your factual foundation.

2. Create an educational phishing-awareness simulation.

3. Include a simulation title, subject, message body,
   learning objective, and warning signs.

4. NEVER ask employees to:
   - Enter a password.
   - Provide login credentials.
   - Share confidential information.
   - Verify an account by submitting sensitive information.

5. Do not write instructions that tell employees to
   click a link to enter credentials.

6. You may show suspicious email characteristics
   for educational purposes, such as:
   - Unknown sender addresses.
   - Urgent language.
   - Unexpected attachments.
   - Suspicious-looking links.

7. If a link is necessary, use ONLY:
   [SIMULATED TRAINING LINK - DO NOT OPEN]

8. Clearly label the message as a controlled
   cybersecurity training exercise.

9. Explain what employees should notice and
   how they should report suspicious activity.

10. Never include functional phishing links.

11. Do not invent cybersecurity facts unsupported
    by the retrieved knowledge.

12. Use simple language suitable for the requested difficulty.


OUTPUT FORMAT:

SIMULATION TITLE:
SUBJECT:
MESSAGE:
LEARNING OBJECTIVE:
WARNING SIGNS:
"""

    response = llm.invoke(prompt)

    content = response.content

    # Convert Gemini structured content into readable text.
    if isinstance(content, list):
        content = "\n".join(
            str(item.get("text", ""))
            for item in content
            if isinstance(item, dict)
        )

    return {
        "generated_content": str(content)
    }


# STEP 4: Perform basic safety checks


def check_safety(state: SimulationState):

    content = state["generated_content"].lower()

    # Detect unsafe credential requests.
    unsafe_patterns = [
        r"please\s+(?:click|visit|open)\s+.{0,100}"
        r"(?:enter|submit|provide)\s+(?:your\s+)?password",

        r"(?:enter|submit|provide|share|send)\s+"
        r"(?:your\s+)?(?:real\s+)?password\s+"
        r"(?:to|on|into)\b",

        r"(?:enter|submit|provide)\s+"
        r"(?:your\s+)?credentials\s+(?:to|on|into)\b",

        r"(?:provide|submit|share)\s+"
        r"(?:your\s+)?confidential\s+information",
    ]

    has_unsafe_request = any(
        re.search(pattern, content)
        for pattern in unsafe_patterns
    )

    # Detect functional URLs.
    text_without_placeholder = content.replace(
        "[simulated training link - do not open]",
        ""
    )

    has_functional_url = bool(
        re.search(r"https?://\S+", text_without_placeholder)
    )

    safety_passed = not (
        has_unsafe_request or has_functional_url
    )

    if safety_passed:
        status = "pending_review"
        error = ""
    else:
        status = "rejected_by_safety_check"
        error = (
            "Unsafe credential request or functional URL detected."
        )

    print("Unsafe credential request:", has_unsafe_request)
    print("Functional URL detected:", has_functional_url)
    print("Safety check:", safety_passed)
    print("Workflow status:", status)

    return {
        "safety_passed": safety_passed,
        "status": status,
        "error": error,
    }



# STEP 5: Decide what happens next
def decide_next_step(state: SimulationState):

    if state.get("safety_passed"):
        return "pending_review"

    return "failed"


# STEP 6: Build the LangGraph workflow
def build_simulation_workflow():

    workflow = StateGraph(SimulationState)

    workflow.add_node("retrieve", retrieve_knowledge)
    workflow.add_node("generate", generate_simulation)
    workflow.add_node("safety_check", check_safety)

    workflow.set_entry_point("retrieve")

    workflow.add_edge("retrieve", "generate")
    workflow.add_edge("generate", "safety_check")

    workflow.add_conditional_edges(
        "safety_check",
        decide_next_step,
        {
            "pending_review": END,
            "failed": END,
        },
    )

    return workflow.compile()


# STEP 7: Run workflow
if __name__ == "__main__":

    app = build_simulation_workflow()

    initial_state = {
        "topic": "Recognizing suspicious phishing emails",
        "difficulty": "beginner",
        "context": "",
        "sources": [],
        "generated_content": "",
        "safety_passed": False,
        "status": "started",
        "error": "",
    }

    result = app.invoke(initial_state)

    print("\n========== LANGGRAPH RESULT ==========")

    print("\nGenerated Simulation:")
    print(result.get("generated_content", "No content generated."))

    print("\nSources:")
    print(result.get("sources", []))

    print("\nSafety Passed:")
    print(result.get("safety_passed"))

    print("\nFinal Status:")
    print(result.get("status"))

    if result.get("error"):
        print("\nError:")
        print(result["error"])
