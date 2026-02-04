# 📉 GST Module - Real Life Usage Guide
# जीएसटी मॉड्यूल - असली दुनिया में कैसे काम करता है?

## 🎯 What is this Module for? / यह मॉड्यूल क्यों है?

यह मॉड्यूल आपको **Input GST (जो आपने भरा)** और **Output GST (जो आपने लिया)** का पूरा हिसाब एक सेकंड में देता है। 

Government को कितना tax देना है - यह seconds में calculate होता है!

---

## 🔥 Real-Life Example / असली उदाहरण

### Scenario: January 2026

#### 1. **Shopping (Purchases) - INPUT GST**
आपने Business के लिए सामान खरीदा:

- **Rajesh Bullion** से Gold: ₹1,00,000 + ₹3,000 GST
- **Perfect Packaging** से Boxes: ₹10,000 + ₹1,800 GST

✅ **Total Input GST (ITC)**: ₹4,800
*(यह पैसा Government के पास जमा है, आप इसे use कर सकते हैं)*

#### 2. **Selling (Sales) - OUTPUT GST**
आपने Customers को Jewelry बेची:

- **Customer A**: ₹2,00,000 + ₹6,000 GST
- **Customer B**: ₹1,50,000 + ₹4,500 GST

⚠️ **Total Output GST**: ₹10,500
*(यह पैसा आपको Government को देना है)*

#### 3. **The Calculation / हिसाब**

Without Software:
> "Oh god, 50 bills check karne padenge... CA ko call karo!"

**With KKP Software (GST Module):**
Go to **Reports > GST Module**:

| Card | Value | Meaning |
|------|-------|---------|
| ↗️ **Output GST** | ₹10,500 | Total Tax Collected from Customers |
| ↙️ **Input GST** | ₹4,800 | Total Tax Paid to Vendors |
| 💰 **Net Payable** | **₹5,700** | (10,500 - 4,800) Only pay this much! |

---

## 🚀 How to Use / कैसे इस्तेमाल करें?

### Step 1: Ensure Data Entry is Correct

1. **For Sales (Output GST)**:
   - Jab bhi **New Order** banayein, "GST Enabled" check karein.
   - Example: Order form me "GST Rate: 3%" select karein.

2. **For Purchases (Input GST)**:
   - Go to **Vendor Master**.
   - Select Vendor > Click **"Purchase Entry"**.
   - Amount aur **GST Amount** alag-alag daalein.
   - Example: Amount 100000, GST 3000.

### Step 2: Check Monthly Report

1. Go to **Reports > GST Reports**.
2. Select **Month** (e.g., January 2026).
3. Check the **"Net GST Credit/Payable"** card.
   - **Green Amount**: Government owes you money (Carry Forward).
   - **Red/Orange Amount**: You have to pay Government.

### Step 3: File Returns (GSTR-1 & GSTR-3B)

Software se data lekar GST Portal par kaise bharein:

#### **For GSTR-1 (Sales Details)**
1. Click **"GSTR-1 Options"** > **"Export Excel"**.
2. Downloaded file CA ko bhejein ya khud portal par upload karein.
3. Isme saari sale details (Invoice No, Date, GSTIN) hoti hain.

#### **For GSTR-3B (Summary Return)**
1. Click **"GSTR-3B Options"** > **"Print A4 Summary"**.
2. Isme exact figures milenge:
   - **3.1 Outward Supplies**: Total Sales + Output Tax.
   - **4. Eligible ITC**: Total Purchases + Input Tax.
3. GST Portal par ye figures copy-paste karein.

---

## 💡 Pro Tips / जरूरी टिप्स

### 1. **Input Tax Credit (ITC) is Cash!**
- Input Tax Credit (ITC) dhyan se record karein.
- Agar aapne ₹10,000 GST bhara hai aur record nahi kiya, to ₹10,000 ka nuksan hai!
- **Vendor Master** mein tax add karna kabhi na bhoolein.

### 2. **Job Work is Service**
- Agar aap Job Work karte hain, to wo bhi service hai.
- Us par bhi GST lagta hai (usually 18% or 5%).
- Orders banate waqt "Job Work" select karein aur GST rate dalein.

### 3. **Carry Forward**
- Agar is mahine Sales kam hui aur Purchase jyada?
- **Example**: Input 10k, Output 2k.
- **Rs 8,000 Carry Forward** ho jayega agle mahine ke liye.
- Software ise automatically track karta hai "ITC Utilization Summary" mein.

---

## ❓ FAQ

**Q: Kya software direct GST Portal par file karta hai?**
A: **Nahi.** Government API access restricted hota hai. Ye software aapko **Exact Report** deta hai jise aap CA ko de sakte hain ya portal par 5 minute mein khud bhar sakte hain.

**Q: "Filing Status" card kya hai?**
A: Ye sirf aapke reminder ke liye hai. Ye actual government status check nahi karta.

**Q: GST calculations galat lag rahi hai?**
A: Check karein:
1. Kya sare Purchases ki entry 'Vendor Master' mein hui hai?
2. Kya sare Orders mein GST enable tha?

---
*Manage Taxes like a Pro!* 😎
