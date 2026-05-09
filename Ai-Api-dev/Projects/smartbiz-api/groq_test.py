from ai import chat_with_ai

response=chat_with_ai(
    user_message="What are you opening?",
    history=[],
    business_name="Goraya's Cafe",
    description="A cozy cafe in Faisalabad serving coffee and snacks",
    faqs="Q: Opening hours? A:8am-10pm daily\nq: Do you deliver? A: yes, via FoodPanda"
    
)
print(response)
