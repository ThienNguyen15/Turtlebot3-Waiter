import re
import json
import time
import fuzzy
import jellyfish
from difflib import SequenceMatcher

# --------------------- Command Items ---------------------
NUM_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
}

# TABLE_COMMANDS = {f"go to table {i}": str(i) for i in range(1, 11)}
# TABLE_COMMANDS.update({f"go to table {word}": str(num) for word, num in NUM_WORDS.items()})
TABLE_COMMANDS = {f"go to table {word}": str(num) for word, num in NUM_WORDS.items()}

PRODUCT_COMMANDS = {
    "chicken and chips": {"productId": "1732544015497", "product_price": 50.0, "product_name": "Chicken and Chips"},
    "pepsi": {"productId": "1732544270677", "product_price": 12.0, "product_name": "Pepsi"},
    "red bull": {"productId": "1732544294894", "product_price": 15.0, "product_name": "Red Bull"},
    "sprite": {"productId": "1732544307860", "product_price": 12.0, "product_name": "Sprite"},
    "cocktail": {"productId": "1732544137447", "product_price": 30.0, "product_name": "Cocktail"},
    "coca cola": {"productId": "1732544111726", "product_price": 12.0, "product_name": "Coca Cola"},
    "fanta": {"productId": "1732544152026", "product_price": 12.0, "product_name": "Fanta"},
    "7 up": {"productId": "1732544087739", "product_price": 12.0, "product_name": "7UP"},
}

# --------------------- Text Processing Functions ---------------------
def text_to_num(phrase):
    """
    Convert a phrase representing a number (from 0 to 100) into an integer if needed.
    Supports simple numbers, tens, and compound numbers (e.g., "fifty one").
    """
    words = [w for w in phrase.lower().split() if w != "and"]

    units = {
        "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
        "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
        "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
        "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19
    }
    tens = {
        "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
        "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90
    }

    if "hundred" in words:
        if words == ["one", "hundred"]:
            return 100
        else:
            return 100

    if len(words) == 1:
        word = words[0]
        if word in units:
            return units[word]
        if word in tens:
            return tens[word]
    elif len(words) == 2:
        if words[0] in tens and words[1] in units:
            return tens[words[0]] + units[words[1]]
    return None

def normalize_transcribed_text(text):
    """
    Replace number words (in the range 0-100) with their numeric representations.
    """
    # Pattern to match number words
    valid_words = (
        "zero|one|two|three|four|five|six|seven|eight|nine|ten|"
        "eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|"
        "eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred"
    )
    pattern = r'\b((?:' + valid_words + r')(?:\s+(?:' + valid_words + r'))*)\b'

    def replacer(match):
        phrase = match.group(0)
        num = text_to_num(phrase)
        return str(num) if num is not None else phrase

    # First, replace number words with their digit equivalents
    text = re.sub(pattern, replacer, text, flags=re.IGNORECASE)
    
    # Mapping from digits (as strings) to words for numbers 1 to 10
    num_to_word = {
        "1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
        "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten"
    }
    
    # Replace occurrences of "table <digit>" with "table <word>"
    def table_replacer(match):
        number = match.group(1)
        # Only replace if the number is in our mapping
        word_form = num_to_word.get(number, number)
        return "table " + word_form

    # Use a case-insensitive regex to find "table" followed by a number
    text = re.sub(r'(?i)\btable\s+(\d+)\b', table_replacer, text)
    
    return text

def normalize_text(text):
    """
    Remove timestamps, punctuation, normalize whitespace, and convert to lowercase.
    """
    text = re.sub(r"\[\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}\]", "", text)
    text = re.sub(r"\[.*?\]", "", text)
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip().lower()

def check_similarity(string1, string2):
    """
        Check the similarity ratio between two strings
    """
    # dmeta = fuzzy.DMetaphone()

    # code1 = dmeta(string1)[0]
    # code2 = dmeta(string2)[0]

    # if code1 is None or code2 is None:
    #     return 0.0
    
    # if isinstance(code1, bytes):
    #     code1 = code1.decode('utf-8')
    # if isinstance(code2, bytes):
    #     code2 = code2.decode('utf-8')
    
    # # Use difflib's SequenceMatcher to compute similarity of the metaphone codes.
    # return SequenceMatcher(None, code1, code2).ratio()

    # Get the metaphone codes for each word.
    code1 = jellyfish.metaphone(string1)
    code2 = jellyfish.metaphone(string2)
    
    # Calculate similarity using SequenceMatcher on the metaphone codes.
    return SequenceMatcher(None, code1, code2).ratio()

def diagnose_matching_content(text, commands, threshold=0.6):
    """
    Fuzzy match text against a list of commands.
    Returns a tuple (best_match, similarity, quantity) with quantity fixed to 1.
    """
    quantity = 1
    candidate = text
    match = re.search(r'\b(\d+)\b', text)

    if match:
        quantity = int(match.group(1))

        if match.end() < len(text) and re.search(r'\btable\s+\d+\b', text) is None:
            candidate = text[match.end():].strip()
    
    best_match, highest_sim = None, 0
    for command in commands:
        sim = check_similarity(candidate, command)
        # print(f"Command: {command} (Similarity: {sim})")
        if sim > highest_sim:
            highest_sim, best_match = sim, command

    if highest_sim >= threshold:
        print(f"Segment: '{candidate}' -> Best matching content: '{best_match}' (Similarity: {highest_sim})")
        return (best_match, highest_sim, quantity)
    else:
        return (None, highest_sim, quantity)

def parse_multiple_orders(order_str):
    """
    Split the order string by the keyword "and" (only if followed by a digit).
    """
    return re.split(r'\s+and\s+(?=\d)', order_str, flags=re.IGNORECASE)

# --------------------- Test Cases and Final JSON Construction ---------------------
def run_tests():
    test_cases = [
        "order eighty one cheap and cheaps and one bandar and ten 7up",
        # "Now, order 10, 7, up.",
        # "go 2 table 6",
        # You can add more test cases here...
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n--- Test Case {i} ---")
        cleaned_text = normalize_text(test)
        cleaned_text = normalize_transcribed_text(cleaned_text)
        print(f"Input: {test}")
        print(f"Processed text: {cleaned_text}\n")
        
        # First, try matching a table command.
        best_table_match, sim, qty = diagnose_matching_content(cleaned_text, TABLE_COMMANDS.keys())
        if best_table_match:
            table_id = TABLE_COMMANDS[best_table_match]
            print(f"Detected table command: go to table {table_id}")
        else:
            # Process as food order command.
            order_items = []
            if re.search(r'\band\s+\d', cleaned_text):
                segments = parse_multiple_orders(cleaned_text)
                for seg in segments:
                    best_match, sim, qty = diagnose_matching_content(seg, PRODUCT_COMMANDS.keys())
                    if best_match:
                        order_items.append((best_match, qty))
                        print(f"Detected order: {qty} of '{best_match}'")
                    else:
                        print(f"No product match found for segment: '{seg}'")
            else:
                best_match, sim, qty = diagnose_matching_content(cleaned_text, PRODUCT_COMMANDS.keys())
                if best_match:
                    order_items.append((best_match, qty))
                    print(f"Detected order: {qty} of '{best_match}'")
                else:
                    print("No valid product command matched.")
            
            if order_items:
                # Build the final JSON order payload.
                total = 0
                items = []
                for product_key, quantity in order_items:
                    product = PRODUCT_COMMANDS[product_key]
                    item_total = product["product_price"] * quantity
                    total += item_total
                    items.append({
                        "productId": product["productId"],
                        "product_name": product["product_name"],
                        "quantity": quantity,
                        "product_price": product["product_price"],
                        "item_total": item_total
                    })
                
                order_data = {
                    "orderId": int(time.time() * 1000),
                    "userId": "table ?",  # Placeholder user/table identifier
                    "items": items,
                    "total": total,
                    "progress": "preparing",
                    "payment_method_types": ["cash"],
                    "status": "paid"
                }
                print("\nFinal Order JSON:")
                print(json.dumps(order_data, indent=4))

if __name__ == "__main__":
    run_tests()
