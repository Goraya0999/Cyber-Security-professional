from groq import Groq
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Debug check
#print(os.getenv("GROQ_API_KEY"))

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

def  build_system_prompt(
    business_name: str,
    description:str,
    faqs: str
) -> str:
    """Build a custom system prompt for a specific business."""
    return f"""you are a helpful, friendly customer for {business_name}.
About this business:
{description}
Frequently Asked Questions:
{faqs}

Your rules:
- Only answer questions relevant to this business
- Be concise _ keep responses under 3 sentences when possible
- if asked something outside your knowledge , say:
    "Great question! let me connect you with our team for that."
- Never invent prices, availability, or policies
- Always be polite and Professional
- Respond in the same language the customer uses"""

def chat_with_ai(
    user_message:str,
    history:list,
    business_name:str,
    description:str,
    faqs:str
) -> str:
    """Send message to Groq and get a response.
    
    Args:
        user_message:the customer's current mesage
        history: list of chatmessage objects from database
        business_name: name of the business 
        description: what the business does 
        faqs:Q&A pairs for the business
        
    returns:
        Groq's response as a string
    """

    messages = []

    # system message (IMPORTANT FIX)
    messages.append({
        "role": "system",
        "content": build_system_prompt(business_name, description, faqs)
    })

    for msg in history[-10:]:
        messages.append({
            "role": msg.role,
            "content": msg.content
        })
        
    messages.append({
        "role": "user",
        "content": user_message
    })
    
    # call groq api (FIXED: correct method)
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        max_tokens=1000,
        messages=messages
    )

    # FIXED: correct response parsing
    return response.choices[0].message.content