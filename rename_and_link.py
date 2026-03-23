import os
import glob
import re

frontend_dir = r"d:\apna\frontend"
images_dir = os.path.join(frontend_dir, "images")

# Mapping of old prefixes/names to new cleaner names
file_mapping = {
    "1_Customer_Dashboard": "user-dashboard",
    "2_User_Profile": "user-profile",
    "3_Events_Listing": "events",
    "4_Homepage_Public_Visitor": "index",
    "5_About_Us": "about",
    "6_Admin_Manage_Events": "admin-events",
    "7_Register_Page": "register",
    "8_Forgot_Password_Page": "forgot-password",
    "9_My_Bookings": "my-bookings",
    "10_Event_Details": "event-details",
    "11_Login_Page": "login",
    "12_Reset_Password_Page": "reset-password",
    "13_Admin_Dashboard_Management": "admin-dashboard",
    "14_Contact_Support": "contact",
    "15_Manage_Users": "admin-users",
    "16_Admin_Dashboard_Analytics": "admin-analytics",
    "17_Reports_Analytics": "admin-reports",
    "18_Book_Ticket": "book-ticket",
    "19_Payment_Checkout": "payment",
    "20_Admin_Login": "admin-login",
    "21_Search_Events": "search",
    "22_Create_New_Event": "admin-create-event",
    "23_Ticket_Details_QR": "ticket-details",
    "24_Manage_Bookings": "admin-bookings",
    "25_Event_Details_Reviews": "event-reviews",
    "26_Booking_Confirmation": "booking-confirmation",
    "27_Notifications_Page": "notifications",
    "28_Help_Center_FAQ": "faq",
    "29_404_Not_Found": "404",
}

def get_new_name(old_name, ext):
    for key, new_name in file_mapping.items():
        if old_name.startswith(key):
            return f"{new_name}{ext}"
    return old_name + ext

# 1. Rename files
print("Renaming files...")
renamed_files_map = {} # old_html_val -> new_html_val
for filepath in glob.glob(os.path.join(frontend_dir, "*.*")):
    basename = os.path.basename(filepath)
    name, ext = os.path.splitext(basename)
    
    if ext.lower() in [".html", ".webp"]:
        new_filename = get_new_name(name, ext.lower())
        new_filepath = os.path.join(frontend_dir, new_filename)
        
        # Move webp to images folder
        if ext.lower() == ".webp":
            new_filepath = os.path.join(images_dir, new_filename)
            
        if filepath != new_filepath:
            os.rename(filepath, new_filepath)
            print(f"Renamed: {basename} -> {os.path.basename(new_filepath)}")
        
        if ext.lower() == ".html":
            renamed_files_map[basename] = new_filename
            # The stitch screens might link to each other with original filenames
            # We will use this map to fix internal links.

# 2. Update HTML content linking and image paths
print("Updating HTML links and image references...")
for filepath in glob.glob(os.path.join(frontend_dir, "*.html")):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace old webp filenames with new paths
    for old_name, new_base in file_mapping.items():
        old_webp = f"{old_name}.webp"
        new_webp = f"images/{new_base}.webp"
        content = content.replace(old_webp, new_webp)

    # Basic intelligent link replacements
    # Since stitch screens usually use `<a href="#">`, we will try to intelligently replace them based on link text if possible.
    # We will use a regex to find all <a href="#">...</a> and replace href based on text content
    
    def replacer(match):
        a_tag = match.group(0)
        text_content = re.sub(r'<[^>]+>', '', match.group(2)).strip().lower()
        
        target = "#"
        if "explore" in text_content or "events" in text_content:
            target = "events.html"
        elif "about" in text_content:
            target = "about.html"
        elif "contact" in text_content:
            target = "contact.html"
        elif "login" in text_content or "sign in" in text_content:
            target = "login.html"
        elif "register" in text_content or "sign up" in text_content:
            target = "register.html"
        elif "dashboard" in text_content:
            target = "user-dashboard.html"
        elif "profile" in text_content:
            target = "user-profile.html"
        elif "book" in text_content:
            target = "book-ticket.html"
        
        if target != "#":
            return match.group(1) + target + match.group(3)
        return a_tag

    # Match <a ... href="#" ...>...</a>
    content = re.sub(r'(<a\s+[^>]*href=")(#)("[^>]*>)(.*?)(</a>)', replacer, content, flags=re.IGNORECASE | re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done.")
