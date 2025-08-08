import sys
import whisper

audio_path = sys.argv[1]
model = whisper.load_model("base")
result = model.transcribe(audio_path)

print(result["text"])
