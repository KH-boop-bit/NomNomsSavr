from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
import os
import asyncio
from dotenv import load_dotenv 
from django.conf import settings

from asgiref.sync import sync_to_async
from pathlib import Path

from telethon import TelegramClient, events
from promotions.models import FoodPromotion
from promotions.utils import parse_telepromo

load_dotenv() 

api_id = int(os.getenv("TELEGRAM_API_ID")) #gets from .env
api_hash = os.getenv("TELEGRAM_API_HASH")
channel = "https://t.me/+Q47802ynKFdmOTk1" #adjust channel as needed 

client = TelegramClient("telegram_session", api_id, api_hash)
BASE_DIR = Path(settings.BASE_DIR) #check where BASE_DIR is routing to now

@client.on(events.NewMessage(chats=channel)) #wait for newmessage to come in
async def handle_message(event): #schedule CRON instead by per 2-3hr basis if maintaining 24/7 server is costly

    message = event.message
    if not message.text:
        return
    
    parsed_message = parse_telepromo(message.text)
    
    if not parsed_message: #handle failed parses (just dunk it for now, maybe add a catcher another time)
        return

    django_imgfile = None
    image_temp_path = None

    if message.photo: #save straight to cloud for image, access using url eventually instead.
        
        image_temp_path = Path(await message.download_media()).resolve() #download media as a regular file on disk
        
        with open(image_temp_path, 'rb') as f: #rewrap the file with as a Django file instead, to save to ImageField model, futureproofing for prod when file is required to readwrite instead of j path
            django_imgfile = ContentFile(f.read())
            django_imgfile.name = f"{message.id}.png"

    defs = {
        **parsed_message,
        'full_message_text': message.text
    }

    if django_imgfile: #if image is present
        defs['image'] = django_imgfile
 
    await sync_to_async(FoodPromotion.objects.update_or_create)( #create if does not alr exist
        telegram_message_id=message.id,
        defaults=defs
    )

    if image_temp_path and image_temp_path.exists(): #clean up image temp path (the regular file at root)
        image_temp_path.unlink() # !!! this does not execute if there is an error in creating promotion Object, so currently dunking failed promotions
    
    

class Command(BaseCommand):
    help = 'Listen for TelePromos and Store'

    def handle(self, *args, **options):
        async def start_telegram():
            await client.start()
            await client.run_until_disconnected()
        
        asyncio.run(start_telegram()) #need actual web server to run outside of development