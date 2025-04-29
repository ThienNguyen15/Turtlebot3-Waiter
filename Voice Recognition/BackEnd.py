import os
import re
import time
import threading
import subprocess
import jellyfish
from pydub.utils import which
from pydub import AudioSegment
from difflib import SequenceMatcher
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, storage, db as rtdb

# import uuid
# from flask import Flask, request, jsonify
# from flask_cors import CORS

# --------------------- Setup ---------------------
os.environ["PATH"] += os.pathsep + "C:/ffmpeg/bin"
AudioSegment.converter = which("ffmpeg")
WHISPER_EXEC = r"C:/GIT/_CapStone Project_/Voice Recognition/Speech2Text/whisper.cpp/build/bin/Release/whisper-cli.exe"
MODEL_PATH = r"C:/GIT/_CapStone Project_/Voice Recognition/Speech2Text/whisper.cpp/models/ggml-base.en.bin"

# app = Flask(__name__)
# CORS(app)

# UPLOAD_FOLDER = "uploads"
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)

load_dotenv()
storage_bucket = os.getenv('STORAGE_BUCKET')
database_url   = os.getenv('DATABASE_URL')

cred = credentials.Certificate("C:/GIT/_CapStone Project_/Voice Recognition/serviceAccountKey.json")
firebase_admin.initialize_app(cred, {
    'storageBucket': storage_bucket,
    'databaseURL': database_url
})
db_fs     = firestore.client()
bucket = storage.bucket()

# --------------------- Command Dictionary ---------------------
# TABLE_POSITIONS = [
#   { "description": "Table0", "id": 0, "name": "Table0", "x": 0.00, "y": 0.00, "yaw": 90.00 },
#   { "description": "Table1", "id": 1, "name": "Table1", "x": 0.10, "y": 0.10, "yaw": 90.00 },
#   { "description": "Table2", "id": 2, "name": "Table2", "x": -0.20, "y": -0.20, "yaw": 90.00 },
#   { "description": "Table3", "id": 3, "name": "Table3", "x": 0.30, "y": 0.30, "yaw": 90.00 },
#   { "description": "Table4", "id": 4, "name": "Table4", "x": -0.40, "y": -0.40, "yaw": 90.00 },
#   { "description": "Table5", "id": 5, "name": "Table5", "x": 0.50, "y": 0.50, "yaw": 90.00 },
#   { "description": "Table6", "id": 6, "name": "Table6", "x": -0.60, "y": -0.60, "yaw": 90.00 },
#   { "description": "Table7", "id": 7, "name": "Table7", "x": 0.70, "y": 0.70, "yaw": 90.00 },
#   { "description": "Table8", "id": 8, "name": "Table8", "x": -0.80, "y": -0.80, "yaw": 90.00 },
#   { "description": "Table9", "id": 9, "name": "Table9", "x": 0.90, "y": 0.90, "yaw": 90.00 },
#   { "description": "Table10", "id": 10, "name": "Table10", "x": 1.00, "y": 1.00, "yaw": 90.00 }
# ]

TABLE_POSITIONS = [
  { "description": "Table1", id: 1, "name": "Table1", "x": -0.431466, "y": -0.927929, "yaw": -64.7273 },
  { "description": "Table2", id: 2, "name": "Table2", "x": -0.3588424623012543, "y": -1.6562724113464355, "yaw": -82.872 },
  { "description": "Table3", id: 3, "name": "Table3", "x": -0.2888265550136566, "y": -2.382502794265747, "yaw": -58.5126 },
  { "description": "Table4", id: 4, "name": "Table4", "x": 0.551529, "y": -1.89651, "yaw": 90.9495 },
  { "description": "Table5", id: 5, "name": "Table5", "x": 0.450258, "y": -0.924623, "yaw": 101.275 },
  { "description": "Kitchen", id: 10, "name": "Table10", "x": -0.743725, "y": -0.2899, "yaw": -78.5854 }
]

start_table_id = 0
end_table_id = 10
num_to_word = {
    0: "zero", 1: "one",   2: "two",    3: "three", 4: "four",  5: "five",
    6: "six",   7: "seven",  8: "eight", 9: "nine", 10: "ten"
}

TABLE_COMMANDS = {
    f"go to table {num_to_word[i]}": str(i)
    for i in range(start_table_id, end_table_id + 1)
}

PRODUCT_COMMANDS = {
    # Signature Dishes
    "special mixed noodles": {"productId": "1732544965365", "product_price": 65.0, "product_name": "Special Mixed Noodles"},
    "broken rice deluxe": {"productId": "1732592976564", "product_price": 65.0, "product_name": "Broken Rice Deluxe"},
    "noodle soup": {"productId": "1732592995691", "product_price": 50.0, "product_name": "Noodle Soup"},

    # Noodles
    "beef mixed noodles": {"productId": "1732544771256", "product_price": 45.0, "product_name": "Beef Mixed Noodles"},
    "crispy pork mixed noodles": {"productId": "1732544786976", "product_price": 45.0, "product_name": "Crispy Pork Mixed Noodles"},
    "garlic chicken mixed noodles": {"productId": "1732544805298", "product_price": 45.0, "product_name": "Garlic Chicken Mixed Noodles"},
    "spaghetti": {"productId": "1732544845067", "product_price": 45.0, "product_name": "Spaghetti"},

    # Rice
    "fried rice": {"productId": "1732544873973", "product_price": 45.0, "product_name": "Fried Rice"},
    "normal broken rice": {"productId": "1732544891914", "product_price": 45.0, "product_name": "Normal Broken Rice"},

    # Chicken
    "chicken and chips": {"productId": "1732544015497", "product_price": 50.0, "product_name": "Chicken and Chips"},
    "sweet sour chicken": {"productId": "1732544034601", "product_price": 35.0, "product_name": "Sweet Sour Chicken"},

    # Drinks
    "monster energy": {"productId": "1732544256055", "product_price": 25.0, "product_name": "Monster Energy"},
    "pepsi": {"productId": "1732544270677", "product_price": 12.0, "product_name": "Pepsi"},
    "red bull": {"productId": "1732544294894", "product_price": 15.0, "product_name": "Red Bull"},
    "sprite": {"productId": "1732544307860", "product_price": 12.0, "product_name": "Sprite"},
    "cocktail": {"productId": "1732544137447", "product_price": 30.0, "product_name": "Cocktail"},
    "coca cola": {"productId": "1732544111726", "product_price": 12.0, "product_name": "Coca Cola"},
    "fanta": {"productId": "1732544152026", "product_price": 12.0, "product_name": "Fanta"},
    "7 up": {"productId": "1732544087739", "product_price": 12.0, "product_name": "7UP"},

    # Fruits
    "apple": {"productId": "1732544482872", "product_price": 30.0, "product_name": "Apple"},
    "banana": {"productId": "1732544497877", "product_price": 15.0, "product_name": "Banana"},
    "blueberry": {"productId": "1732544539992", "product_price": 30.0, "product_name": "Blueberry"},
    "grape": {"productId": "1732544558423", "product_price": 20.0, "product_name": "Grape"},
    "mango": {"productId": "1732544572297", "product_price": 20.0, "product_name": "Mango"},
    "raspberry": {"productId": "1732544596463", "product_price": 30.0, "product_name": "Raspberry"},
    "strawberry": {"productId": "1732544706420", "product_price": 30.0, "product_name": "Strawberry"},
    "watermelon": {"productId": "1732544746518", "product_price": 30.0, "product_name": "Watermelon"},

    # Desserts
    "chocolate ice cream": {"productId": "1732591249421", "product_price": 15.0, "product_name": "Chocolate Ice Cream"},
    "harlequin ice cream": {"productId": "1732544196293", "product_price": 25.0, "product_name": "Harlequin Ice Cream"},
    "mango cream": {"productId": "1732544219570", "product_price": 25.0, "product_name": "Mango Cream"},
    "strawberry ice cream": {"productId": "1732544441893", "product_price": 15.0, "product_name": "Strawberry Ice Cream"},

    # Sides
    "egg meatloaf": {"productId": "1732545565792", "product_price": 15.0, "product_name": "Egg Meatloaf"},
    "fried egg": {"productId": "1732545589249", "product_price": 12.0, "product_name": "Fried Egg"},
    "pork skin": {"productId": "1732545601770", "product_price": 12.0, "product_name": "Pork Skin"},
    "rice": {"productId": "1732545615070", "product_price": 5.0, "product_name": "Rice"},
    "seaweed soup": {"productId": "1732545628018", "product_price": 15.0, "product_name": "Seaweed Soup"}
}

# --------------------- Text Processing Functions ---------------------
def text_to_num(phrase):
    """
        Convert a phrase representing a number (from 0 to 100) into an integer if needed
    """
    # Remove the word "and" if present
    words = [w for w in phrase.lower().split() if w != "and"]

    # Define units and teens
    units = {
        "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
        "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
        "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
        "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19
    }

    # Define tens multiples
    tens = {
        "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
        "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90
    }

    # Handle numbers that include "hundred"
    if "hundred" in words:
        return 100

    # Handle numbers without "hundred"
    if len(words) == 1:
        word = words[0]
        if word in units:
            return units[word]
        if word in tens:
            return tens[word]
    elif len(words) == 2:
        if words[0] in tens and words[1] in units:
            return tens[words[0]] + units[words[1]]

def normalize_transcribed_text(text):
    """
        Find and replace number words (in the range 0-100) with their numeric representations if needed
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
        Remove timestamps, punctuation, normalize whitespace, and convert to lowercase
    """
    print(f"Original text: {text}")
    # Remove timestamps like [00:00:00.000 --> 00:00:10.000]
    text = re.sub(r"\[\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}\]", "", text)
    # Remove any content within square brackets
    text = re.sub(r"\[.*?\]", "", text)
    # Remove punctuation
    text = re.sub(r"[^\w\s]", "", text)
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text)
    return text.strip().lower()

def extract_table_from_ordered_text(text):
    """
        Keyword "in" to extract table id
    """

    valid_words = {
        "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
        "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10"
    }
    m = re.search(r'\bin table\s+(\w+)\b', text, flags=re.IGNORECASE)
    if not m:
        return None
    tok = m.group(1).lower()

    return valid_words.get(tok, tok)


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
    
    # # Use difflib's SequenceMatcher to compute similarity of the metaphone codes
    # return SequenceMatcher(None, code1, code2).ratio()

    code1 = jellyfish.metaphone(string1)
    code2 = jellyfish.metaphone(string2)
    
    # # Use difflib's SequenceMatcher to compute similarity of the metaphone codes
    return SequenceMatcher(None, code1, code2).ratio()


def diagnose_matching_content(text, commands, threshold=0.55):
    """
        Fuzzy match text against a list of commands
    """
    quantity = 1
    candidate = text
    match = re.search(r'\b(\d+)\b', text)

    if match:
        quantity = int(match.group(1))

        if match.end() < len(text) and re.search(r'\btable\s+\w+\b', text) is None:
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
        If there are multiple orders, segments will be separated by the keyword "and"
        The regex splits only if there is a digit following "and"
    """
    segments = re.split(r'\s+and\s+(?=\d)', order_str, flags=re.IGNORECASE)
    return segments

# --------------------- Firestore Upload Functions ---------------------
def order_command_to_database(table_id, order_items, user_id="None"):
    """
        Push order command(s) to Database in the correct format
    """
    items = []
    total = 0
    for product_key, quantity in order_items:
        product = PRODUCT_COMMANDS[product_key]
        item_total = product["product_price"] * quantity
        total += item_total
        items.append({
            "productId": product["productId"],
            "product_name": product["product_name"],
            "product_price": product["product_price"],
            "quantity": quantity,
            # "item_total": item_total
        })

    customer = {
        "address": {
            "city": None,
            "country": "VN",
            "line1": None,
            "line2": None,
            "postal_code": None,
            "state": None
        },
        "email": "None",
        "name": "None",
        "phone": "None",
        "tax_exempt": "None",
        "tax_ids": []
    }

    order_data = {
        "customer": customer,
        "intenId": "None",
        "is_reach": 0,
        "items": items,
        "orderId": int(time.time() * 1000),
        "payment_method_types": ["cash"],
        "progress": "preparing",
        "status": "cash",
        "table": table_id,
        "total": total,
        "userId": user_id
    }

    db_fs.collection("orders").document(str(order_data["orderId"])).set(order_data)
    print(f"Order added to Firestore with total amount: {total}")

def table_command_to_database(table_id):
    """
        Push movement command to Database in the correct format
    """
    ref = rtdb.reference('request')
    # ref = rtdb.reference('actions/request')
    current = ref.get()
    if not current:
        print("No existing request node")
        return

    num = current.get('numStation', 0)
    if num < 0:
        print("Invalid numStation")
        return

    last_idx = num - 1
    last_station = current.get(f'station{last_idx}')
    if not last_station:
        print(f"station{last_idx} not found")
        return

    ref.update({
        'id': current.get('id'),
        'numStation': 2,
        'station0': last_station,
        'station1': TABLE_POSITIONS[int(table_id)],
        'turtlebot_state': current.get('turtlebot_state')
    })
    print(f"Updated Real-Time to go first to {last_station['name']}, then to {TABLE_POSITIONS[int(table_id)]['name']}")

# --------------------- Callback Firestore Listener ---------------------
def on_voice_snapshot(col_snap, changes, _):
    for change in changes:
        doc  = change.document
        data = doc.to_dict()

        # 'processed' == 'None' -> process Audio
        if data.get('processed') == 'None':
            threading.Thread(target=process_record, args=(doc,)).start()

        # true_request == 'Yes' and 'processed' != 'Done' -> not Confirmed yet
        elif data.get('true_request') == 'Yes' and data.get('processed') != 'Done':
            threading.Thread(target=finalize_record, args=(doc,)).start()

# --------------------- Process Audio ---------------------
def process_record(doc):
    d = doc.to_dict()

    # Download
    local_webm = f"uploads/{doc.id}.webm"
    bucket.blob(d['storagePath']).download_to_filename(local_webm)

    # Convert
    local_wav = f"uploads/{doc.id}.wav"
    AudioSegment.from_file(local_webm, format="webm") \
                .export(local_wav, format="wav", parameters=["-ar","16000"])

    # Whisper 
    cmd    = [WHISPER_EXEC, "-m", MODEL_PATH, "-f", local_wav]
    result = subprocess.run(cmd, capture_output=True, text=True)
    raw    = result.stdout.strip()

    # Parse
    timestamp_match = re.match(r"\[.*?-->\s*.*?\]", raw)
    duration = timestamp_match.group(0) if timestamp_match else None
    cleaned    = normalize_text(raw)
    normalized = normalize_transcribed_text(cleaned)

    table_id   = extract_table_from_ordered_text(normalized)
    content    = (normalized.split("in table")[0].strip()
                  if "in table" in normalized else normalized)
    
    cmd_type = "Unknown"
    proc_text = "⚠️ Doesn't match any commands."
    orders = []

    if table_id is not None:
        segments = (parse_multiple_orders(content)
                    if re.search(r'\band\s+\d', content) else [content])
        for seg in segments:
            prod, sim, qty = diagnose_matching_content(seg, PRODUCT_COMMANDS.keys(), threshold=0.55)
            if prod:
                orders.append((prod, qty))

        if orders:
            cmd_type  = "Order Dishes"
            proc_text = f"Order {' and '.join(f'{qty} {p}' for p,qty in orders)} in table {table_id}"
    else:
        best, sim, qty = diagnose_matching_content(normalized, TABLE_COMMANDS.keys())
        if best:
            cmd_type  = "Take Dishes"
            proc_text = f"Go to table {TABLE_COMMANDS[best]}"
            table_id = TABLE_COMMANDS[best]

    # Update Firestore document
    items_data = [{"productKey": p_key, "quantity": qty} for p_key,qty in orders]
    doc.reference.update({
        'original': normalized,
        'processed':   proc_text,
        'type':        cmd_type,
        'table':       table_id,
        'items':       items_data,
        'duration':    duration
    })

# --------------------- Confirm Yes -> Finalize ---------------------
def finalize_record(doc):
    d = doc.to_dict()
    if d['type'] == 'Order Dishes':
        raw_items   = d.get('items', [])
        order_items = [
            (item.get('productKey'), item.get('quantity'))
            for item in raw_items
            if 'productKey' in item and 'quantity' in item
        ]
        user_id = d.get("customerId", doc.id)
        order_command_to_database(d['table'], order_items, user_id)

    elif d['type'] == 'Take Dishes':
        table_command_to_database(d['table'])

    doc.reference.update({'processed': 'Done'})

# --------------------- Main Loop ---------------------
if __name__ == "__main__":
    os.makedirs("uploads", exist_ok=True)

    db_fs.collection("voices").on_snapshot(on_voice_snapshot)
    print("🚀 Listening to Firestore 'voice' collection…")

    while True:
        time.sleep(1)


## --------------------- Routes ---------------------
# @app.route('/upload', methods=['POST'])
# def upload():
#     print("===> 📥 Receiving request from React")

#     if 'file' not in request.files:
#         print("❌ Doesn't have file in request.")
#         return jsonify({"error": "no file in request"}), 400

#     file = request.files['file']
#     uid = uuid.uuid4().hex
#     temp_webm = os.path.join(UPLOAD_FOLDER, f"{uid}.webm")
#     wav_path  = os.path.join(UPLOAD_FOLDER, f"{uid}.wav")
#     try:
#         file.save(temp_webm)

#         # Convert WebM to WAV
#         audio = AudioSegment.from_file(temp_webm, format="webm")
#         audio.export(wav_path, format="wav", parameters=["-ar", "16000"])
#         print(f"📄 Converted {temp_webm} → {wav_path}")
#         print(f"📄 Saving file at: {wav_path}")
#     except Exception as e:
#         print(f"❌ Writting file fail: {e}")
#         return jsonify({"error": "Saving file fail"}), 500

#     if not os.path.exists(wav_path):
#         print("❌ File doesn't exist when saving.")
#         return jsonify({"error": "Saving file fail"}), 500

#     command = [WHISPER_EXEC, "-m", MODEL_PATH, "-f", wav_path.replace('\\\\', '/').replace('\\', '/')]

#     print("🚀 Call Whisper CLI:", " ".join(command))

#     try:
#         result = subprocess.run(command, capture_output=True, text=True, check=True)
#         print("✅ Whisper CLI STDOUT:\n", result.stdout)
#         print("✅ Whisper CLI STDERR:\n", result.stderr)
#     except subprocess.CalledProcessError as e:
#         print("❌ Whisper CLI has an error:", e.stderr)
#         return jsonify({"error": "whisper-cli failed", "stderr": e.stderr}), 500

#     raw = result.stdout.strip()
#     if not raw:
#         print("⚠️ Whisper CLI doesn't recognize any text.")
#         return jsonify({"error": "empty result from whisper"}), 500

#     # Normalize the transcribed text: first remove unwanted characters then convert number words
#     cleaned_text = normalize_text(raw)
#     normalized_text = normalize_transcribed_text(cleaned_text)
#     print(f"Transcribed text after normalization: {normalized_text}")

#     table_id = extract_table_from_ordered_text(normalized_text)
#     cmd_type = 'Unknown'

#     content_part = normalized_text
#     if "in table" in normalized_text:
#         content_part = normalized_text.split("in table")[0].strip()

#     # Check if it's food order command(s)
#     order_items = []
#     # If multiple orders exist, split into segments using "and" as separator when followed by a number
#     if re.search(r'\band\s+\d', content_part):
#         segments = parse_multiple_orders(content_part)
#     else:
#         segments = [content_part]

#     for seg in segments:
#         best_prod, similarity, quantity = diagnose_matching_content(seg, PRODUCT_COMMANDS.keys(), threshold=0.55)
#         if best_prod:
#             order_items.append((best_prod, quantity))

#     if order_items:
#         # Extract the actual table identifier if available
#         # order_command_to_database(table_id, order_items)
#         cmd_type = 'Order Dishes'

    
#     # Check if it's a table movement command
#     best_table_match, similarity, quantity = diagnose_matching_content(normalized_text, TABLE_COMMANDS.keys())
#     if best_table_match:
#         table_id = TABLE_COMMANDS[best_table_match]
#         # table_command_to_database(table_id)
#         cmd_type = 'Take Dishes'

#     return jsonify({
#         'raw': raw,
#         'cleaned_text': cleaned_text,
#         'normalized_text': normalized_text,
#         'type': cmd_type,
#         'table': table_id,
#         'items': order_items
#     })

# @app.route('/confirm', methods=['POST'])
# def confirm_command():
#     data     = request.json
#     cmd_type = data.get('type')
#     table    = data.get('table')
#     items    = data.get('items', [])

#     if cmd_type == 'Order Dishes':
#         order_command_to_database(table, items)
#     elif cmd_type == 'Take Dishes':
#         table_command_to_database(table)
#     else:
#         return jsonify({'error': 'Unknown Command Type'}), 400

#     return jsonify({'status': 'Saved'})

# if __name__ == '__main__':
#     app.run(debug=True, host="localhost", port=8080, threaded=True)