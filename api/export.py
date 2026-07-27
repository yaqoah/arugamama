import os
import json
import uuid
import datetime
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler

def add_months(sourcedate, months):
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    # Find the max day for that month
    max_day = [31,
        29 if year % 4 == 0 and not year % 400 == 0 else 28,
        31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
    day = min(sourcedate.day, max_day)
    return datetime.date(year, month, day)

def generate_ical(lease_start, annual_rent, cheques, property_label):
    cheque_amount = float(annual_rent) / int(cheques)
    months_interval = 12 // int(cheques)
    
    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Arugamama//Rent Schedule//EN",
        "CALSCALE:GREGORIAN",
    ]
    
    now_stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    
    for i in range(int(cheques)):
        due_date = add_months(lease_start, i * months_interval)
        
        # All-day event format: YYYYMMDD
        start_str = due_date.strftime("%Y%m%d")
        end_date = due_date + datetime.timedelta(days=1)
        end_str = end_date.strftime("%Y%m%d")
        
        event_uid = f"{uuid.uuid4()}@arugamama.com"
        
        ics_lines.extend([
            "BEGIN:VEVENT",
            f"UID:{event_uid}",
            f"DTSTAMP:{now_stamp}",
            f"DTSTART;VALUE=DATE:{start_str}",
            f"DTEND;VALUE=DATE:{end_str}",
            f"SUMMARY:Cheque #{i+1} Rent Payment - {property_label}",
            f"DESCRIPTION:Amount Due: AED {cheque_amount:,.2f}. Ensure funds are cleared 3 business days prior.",
            "BEGIN:VALARM",
            "TRIGGER:-P3D",
            "ACTION:DISPLAY",
            "DESCRIPTION:Reminder: Rent cheque due in 3 days",
            "END:VALARM",
            "END:VEVENT"
        ])
        
    ics_lines.append("END:VCALENDAR")
    return "\r\n".join(ics_lines) + "\r\n"

def generate_fallback_html(payload):
    lease_start = payload.get('_parsed_date')
    annual_rent = float(payload.get('annual_rent', 0))
    cheques = int(payload.get('cheques', 1))
    property_label = payload.get('property_label', 'Property')
    
    cheque_amount = annual_rent / cheques
    months_interval = 12 // cheques
    
    rows = ""
    for i in range(cheques):
        due_date = add_months(lease_start, i * months_interval)
        rows += f"""
            <tr>
                <td>{i+1}</td>
                <td>{due_date.strftime('%B %d, %Y')}</td>
                <td>AED {cheque_amount:,.2f}</td>
            </tr>
        """
        
    return f"""<!DOCTYPE html>
<html>
<head>
    <title>Rent Schedule - {property_label}</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }}
        @media print {{
            body {{ padding: 0; }}
            .no-print {{ display: none; }}
        }}
        .invoice-box {{ max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); }}
        table {{ width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; margin-top: 20px; }}
        table th, table td {{ padding: 12px; vertical-align: top; border-bottom: 1px solid #eee; }}
        table th {{ background: #f8f8f8; }}
        .header {{ font-size: 24px; font-weight: bold; margin-bottom: 5px; }}
        .subheader {{ color: #777; margin-bottom: 20px; }}
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">Rent Payment Schedule</div>
        <div class="subheader">{property_label}</div>
        <button class="no-print" onclick="window.print()" style="margin-bottom:20px; padding:10px 15px; cursor:pointer; background:#000; color:white; border:none; border-radius:6px; font-weight:bold;">Print / Save as PDF</button>
        <table>
            <tr>
                <th>Cheque #</th>
                <th>Due Date</th>
                <th>Amount</th>
            </tr>
            {rows}
            <tr style="font-weight:bold; background:#f8f8f8;">
                <td colspan="2">Total Annual Rent</td>
                <td>AED {annual_rent:,.2f}</td>
            </tr>
        </table>
    </div>
</body>
</html>"""

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            req_body = json.loads(post_data.decode('utf-8'))
            
            # Gracefully handle date parsing
            lease_date_str = req_body.get('lease_start_date', '')
            try:
                # Handle basic iso formats, replacing Z if present
                lease_start = datetime.datetime.fromisoformat(lease_date_str.replace('Z', '+00:00')).date()
            except Exception:
                lease_start = datetime.date.today()
                
            req_body['_parsed_date'] = lease_start
            
            export_type = req_body.get('export_type', 'ical')
            
            if export_type == 'ical':
                ical_data = generate_ical(
                    lease_start,
                    req_body.get('annual_rent', 0),
                    req_body.get('cheques', 1),
                    req_body.get('property_label', 'Property')
                )
                
                self.send_response(200)
                self.send_header('Content-Type', 'text/calendar; charset=utf-8')
                self.send_header('Content-Disposition', 'attachment; filename="rent_cheque_schedule.ics"')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(ical_data.encode('utf-8'))
                
            elif export_type == 'pdf':
                self.handle_pdf(req_body)
            else:
                self.send_error(400, "Invalid export_type. Expected 'ical' or 'pdf'")
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_pdf(self, payload):
        n8n_url = os.environ.get('N8N_WEBHOOK_URL')
        
        # Remove internal parsing state before forwarding
        forward_payload = {k: v for k, v in payload.items() if not k.startswith('_')}
        
        if n8n_url:
            try:
                req = urllib.request.Request(
                    n8n_url,
                    data=json.dumps(forward_payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )
                with urllib.request.urlopen(req, timeout=3.0) as response:
                    res_body = response.read()
                    
                    self.send_response(200)
                    content_type = response.headers.get('Content-Type', 'application/pdf')
                    self.send_header('Content-Type', content_type)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(res_body)
                    return
            except Exception as e:
                print(f"n8n webhook failed or timed out: {e}")
                
        # Fallback HTML with print CSS
        html = generate_fallback_html(payload)
        
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(html.encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
