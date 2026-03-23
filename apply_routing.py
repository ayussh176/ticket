import os
import glob
from bs4 import BeautifulSoup

frontend_dir = r"d:\apna\frontend"

def get_target_url(text, current_href=""):
    text = text.strip().lower()
    
    # Exact mappings from prompt
    if text in ["home", "landing page"]: return "index.html"
    if "browse events" in text or text == "events": return "events.html"
    if "view event" in text or "event details" in text: return "event-details.html"
    if "book ticket" in text or "book now" in text: return "book-ticket.html"
    if "proceed to payment" in text or "pay now" in text: return "payment.html"
    if "confirm payment" in text or "booking confirmation" in text: return "booking-confirmation.html"
    if "view ticket" in text or "ticket details" in text: return "ticket-details.html"
    
    if text == "login" or text == "sign in": return "login.html"
    if text == "register" or text == "sign up": return "register.html"
    if "forgot password" in text: return "forgot-password.html"
    if "reset password" in text: return "reset-password.html"
    
    # User Dashboard
    if text == "dashboard":
        if "admin" in current_href.lower():
            return "admin-dashboard.html"
        return "user-dashboard.html"
    if "search events" in text or "search" in text: return "search.html"
    if "my bookings" in text: return "my-bookings.html"
    if text == "profile" or "my profile" in text: return "user-profile.html"
    
    # Admin
    if "admin login" in text: return "admin-login.html"
    if "manage events" in text: return "admin-events.html"
    if "create event" in text: return "admin-create-event.html"
    if "manage bookings" in text: return "admin-bookings.html"
    if "manage users" in text: return "admin-users.html"
    if text == "reports": return "admin-reports.html"
    
    if text == "about": return "about.html"
    if text == "contact" or "contact us" in text: return "contact.html"
    
    # Fallbacks based on partial matches if href is broken
    if current_href in ["#", "", "/", None]:
        if "dashboard" in text: return "user-dashboard.html"
        if "events" in text: return "events.html"
        if "profile" in text: return "user-profile.html"
        if "book" in text: return "book-ticket.html"
    
    return current_href

def process_html_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()
        
    soup = BeautifulSoup(html, 'html.parser')
    
    # 1. Fix Anchor Tags
    for a in soup.find_all('a'):
        text = a.get_text()
        current_href = a.get('href', '')
        
        # Don't touch external links
        if current_href.startswith('http'): continue
        
        if text.strip() or current_href in ["#", "", "/"]:
            new_href = get_target_url(text, current_href)
            
            # Additional logic for specific missing explicit text links
            if current_href == "#" or current_href == "/":
                # Check icon or structural names if text is empty
                if not text.strip():
                    if a.find(string=lambda t: t and 'dashboard' in t.lower()):
                        new_href = "user-dashboard.html"
                        
            # Apply href if we translated something
            if new_href and new_href != current_href:
                a['href'] = new_href
            elif current_href == "#":
                # Default # removal if we couldn't figure it out perfectly
                a['href'] = "javascript:void(0)"
                
    # 2. Fix Buttons
    for btn in soup.find_all('button'):
        if btn.get('type') == 'submit' or 'onclick' in btn.attrs:
            continue
            
        text = btn.get_text().strip().lower()
        if not text: continue
        
        target = get_target_url(text)
        if target and target not in ["#", "", "/", "javascript:void(0)"]:
            btn['onclick'] = f"window.location.href='{target}'"
            
    # 3. Handle Forms (ensure action doesn't block js)
    for form in soup.find_all('form'):
        if not form.get('action') or form.get('action') == '#':
            # Guess based on context
            btnText = ""
            submitBtn = form.find('button', type='submit')
            if submitBtn: btnText = submitBtn.get_text().strip().lower()
            
            if 'admin-login' in filepath.lower(): form['action'] = "admin-dashboard.html"
            elif 'login' in filepath.lower(): form['action'] = "user-dashboard.html"
            elif 'register' in filepath.lower(): form['action'] = "user-dashboard.html"
            elif 'payment' in filepath.lower(): form['action'] = "booking-confirmation.html"
            elif 'admin-create-event' in filepath.lower(): form['action'] = 'admin-events.html'
            elif 'sign in' in btnText or 'login' in btnText: form['action'] = "user-dashboard.html"
            elif 'sign up' in btnText or 'register' in btnText: form['action'] = "user-dashboard.html"
            elif 'pay' in btnText or 'confirm' in btnText: form['action'] = "booking-confirmation.html"

    # 4. Inject script js/app.js
    if not soup.find('script', src='js/app.js'):
        script_tag = soup.new_tag('script', src='js/app.js')
        if soup.body:
            soup.body.append(script_tag)
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(str(soup))

print("Processing files...")
for file in glob.glob(os.path.join(frontend_dir, "*.html")):
    print(f"Processing {file}")
    process_html_file(file)
print("Done!")
