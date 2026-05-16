import os
import json
from typing import Annotated, TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

# State definition
class AgentState(TypedDict):
    query: str
    results: List[dict]

# Lazy initialization for tools and model
def get_tools():
    return TavilySearchResults(k=10, tavily_api_key=os.getenv("TAVILY_API_KEY"))

def get_llm():
    return ChatGroq(
        model="openai/gpt-oss-120b",
        groq_api_key=os.getenv("GROQ_API_KEY"),
        temperature=0
    )

def search_agrovets(state: AgentState):
    query = state['query']
    # If query is empty, default to a general search for Kenya
    location_context = query if query else "Kenya"
    
    # Improved query for better Tavily coverage
    search_query = f"Agrovets and agricultural input stores in {location_context} Kenya contact phone numbers and locations"
    
    try:
        tavily_tool = get_tools()
        llm = get_llm()
        search_results = tavily_tool.invoke({"query": search_query})
        # Also try a second query for redundancy
        search_results_2 = tavily_tool.invoke({"query": f"Facebook pages of agrovets in {location_context} Kenya"})
        combined_results = f"{search_results}\n\n{search_results_2}"
    except Exception as e:
        print(f"Tool Initialization or Search Error: {e}")
        combined_results = "No results found due to error."

    prompt = f"""
    You are an expert agricultural data extractor. Your goal is to find as many agrovets,
     veterinary clinics, and agricultural input suppliers as possible from the search 
     results below for {location_context}, Kenya.
    
    Instructions:
    - Be inclusive: If a business looks like an agrovet or farm supplier, include it.
    - Even if details are partial (e.g., missing phone), include the business with "Contact via Map".
    - Check for names like "Agrovet", "Farmcare", "Feeds", "Veterinary", "Suppliers".
    - Look for locations specifically in or near {location_context}.
    
    Search Results:
    {combined_results}
    
    Output Format (JSON list only):
    [
      {{
        "name": "Business Name",
        "deals_with": "What they sell",
        "location": "Specific Area/Town",
        "contact_number": "Phone or 'Contact via Map'",
        "website_link": "Link or null"
      }}
    ]
    """
    
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content.strip()

        import re
        # Find the JSON array in the content
        json_match = re.search(r'\[\s*\{.*\}\s*\]', content, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
        else:
            # Fallback to the whole content if no array markers found
            json_str = content

        data = json.loads(json_str)
        # Ensure it's a list
        if not isinstance(data, list):
            data = []
            
        # Add some default fields for the frontend
        for item in data:
            item['is_onboarded'] = False
            item['item_type'] = 'external_stockist'
            item['agency_name'] = item.get('name', 'Agrovet Provider')
            item['agency_type'] = 'agrovet'
            item['inputs_offered'] = item.get('deals_with', 'Agricultural Inputs')
            item['support_phone'] = item.get('contact_number', 'Contact via Map')
            item['website_link'] = item.get('website_link')
            item['description'] = item.get('deals_with', 'General Agrovet Services')
            
        return {"results": data}
    except Exception as e:
        print(f"Agent Logic/Parse Error: {e}")
        print(f"Raw Content that failed to parse: {content}")
        return {"results": []}

# Compile the graph
builder = StateGraph(AgentState)
builder.add_node("search", search_agrovets)
builder.set_entry_point("search")
builder.add_edge("search", END)
agrovet_agent = builder.compile()

def run_agrovet_agent(query: str):
    """Entry point to run the agent."""
    state = {"query": query, "results": []}
    try:
        result = agrovet_agent.invoke(state)
        return result.get("results", [])
    except Exception as e:
        print(f"Agent Execution Error: {e}")
        return []
