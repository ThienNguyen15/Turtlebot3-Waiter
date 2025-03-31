import os
import re
import time
import webrtcvad
import sounddevice as sd
import scipy.io.wavfile as wav
import fuzzy
import jellyfish
from difflib import SequenceMatcher
import subprocess
import numpy as np
import firebase_admin
from firebase_admin import credentials, firestore

# --------------------- Configuration ---------------------
WHISPER_PATH = r"C:\GIT\_CapStone Project_\Voice Recognition\Speech2Text\whisper.cpp"
MODEL_PATH = os.path.join(WHISPER_PATH, "models", "ggml-base.en.bin")
WHISPER_EXEC = os.path.join(WHISPER_PATH, "build", "bin", "Release", "whisper-cli.exe")

SAMPLERATE = 16000         # 16 kHz required by Whisper
CHANNELS = 1
FRAME_DURATION = 30        # in milliseconds
MAX_SILENCE = 2            # seconds of silence to stop recording
OUTPUT_WAV = "input.wav"

# --------------------- Firebase Setup ---------------------
cred = credentials.Certificate("C:/GIT/_CapStone Project_/Voice Recognition/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# --------------------- Command Items ---------------------

start_table_id = 1
end_table_id = 10
TABLE_COMMANDS = {f"go to table {i}": str(i) for i in range(start_table_id, end_table_id + 1)}

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
        If there are multiple orders, segments will be separated by the keyword "and"
        The regex splits only if there is a digit following "and"
    """
    segments = re.split(r'\s+and\s+(?=\d)', order_str, flags=re.IGNORECASE)
    return segments

# --------------------- Audio Processing Functions ---------------------
def record_with_vad(filename):
    """
        Record audio using Voice Activity Detection (VAD) and stop when silence lasts for MAX_SILENCE seconds
    """
    print("Recording... Speak your command.")
    vad = webrtcvad.Vad()
    vad.set_mode(2)  # Mode 2 balances sensitivity and accuracy
    frames_per_chunk = int(SAMPLERATE * FRAME_DURATION / 1000)
    audio_buffer, silence_time = [], 0.0

    try:
        with sd.InputStream(samplerate=SAMPLERATE, channels=CHANNELS, dtype=np.int16) as stream:
            while True:
                data, overflow = stream.read(frames_per_chunk)
                if overflow:
                    print("Buffer overflow!")
                    continue
                is_speech = vad.is_speech(data.tobytes(), SAMPLERATE)
                audio_buffer.append(data)
                silence_time = 0 if is_speech else silence_time + FRAME_DURATION / 1000.0
                if silence_time >= MAX_SILENCE:
                    print("Silence detected. Stopping recording.")
                    break

        audio_array = np.concatenate(audio_buffer, axis=0)
        wav.write(filename, SAMPLERATE, audio_array)
        print(f"Recording saved to {filename}.")
    except Exception as e:
        print(f"Error during recording: {e}")

def implement_whisper(filename):
    """
        Run Whisper CLI to transcribe the recorded audio
    """
    print("Processing audio with Whisper...")
    command = [WHISPER_EXEC, "-m", MODEL_PATH, "-f", filename]
    try:
        result = subprocess.run(command, capture_output=True, text=True)
        return result.stdout.strip() if result.returncode == 0 else ""
    except FileNotFoundError:
        print("Whisper executable not found. Check the WHISPER_EXEC path.")
        return ""

# --------------------- Firestore Upload Functions ---------------------
def order_command_to_database(table_id, order_items):
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
            "quantity": quantity,
            "product_price": product["product_price"],
            "item_total": item_total
        })

    order_data = {
        "orderId": int(time.time() * 1000),
        "userId": table_id,
        "items": items,
        "total": total,
        "progress": "preparing",
        "payment_method_types": ["cash"],
        "status": "paid",
    }

    db.collection("orders").document(str(order_data["orderId"])).set(order_data)
    print(f"Order added to Firestore with total amount: {total}")

def table_command_to_database(table_id):
    """
        Push movement command to Database in the correct format
    """
    table_data = {
        "commandId": int(time.time() * 1000),
        "task": "going to designated table",
        "status": "in progress",
        "tableId": table_id,
    }

    db.collection("actions").document(str(table_data["commandId"])).set(table_data)
    print(f"Table movement command added: Going to table {table_id}")

# --------------------- Main Program ---------------------
def main():
    print("Program started!")
    while True:
        print("Type 's' to start recording or 'e' to exit.")
        user_input = input(">> ").strip().lower()
        if user_input == "e":
            print("Exiting program.")
            break
        elif user_input == "s":
            print("Listening... Please speak your command.")
            record_with_vad(OUTPUT_WAV)
            transcribed_text = implement_whisper(OUTPUT_WAV)
            # Normalize the transcribed text: first remove unwanted characters then convert number words
            cleaned_text = normalize_text(transcribed_text)
            clean_transcribed_text = normalize_transcribed_text(cleaned_text)
            print(f"Transcribed text after normalization: {clean_transcribed_text}")

            # Check if it's a table movement command
            best_table_match, similarity, quantity = diagnose_matching_content(clean_transcribed_text, TABLE_COMMANDS.keys())
            if best_table_match:
                table_id = TABLE_COMMANDS[best_table_match]
                table_command_to_database(table_id)
                continue

            # Check if it's food order command(s)
            order_items = []
            # If multiple orders exist, split into segments using "and" as separator when followed by a number
            if re.search(r'\band\s+\d', clean_transcribed_text):
                segments = parse_multiple_orders(clean_transcribed_text)
                for seg in segments:
                    best_match, similarity, qty = diagnose_matching_content(seg, PRODUCT_COMMANDS.keys())
                    if best_match:
                        order_items.append((best_match, qty))
                    else:
                        print(f"No product match found for segment: '{seg}'")
            else:
                best_match, similarity, qty = diagnose_matching_content(clean_transcribed_text, PRODUCT_COMMANDS.keys())
                if best_match:
                    order_items.append((best_match, qty))
                else:
                    print("No product command matched. Please try again.")

            if order_items:
                # Replace "table ?" with the actual table identifier if available.
                order_command_to_database("table ?", order_items)

            print("Listening mode off. Type 's' to start again or 'e' to exit.")
        else:
            print("Invalid input. Type 's' to start or 'e' to exit.")

if __name__ == "__main__":
    main()
