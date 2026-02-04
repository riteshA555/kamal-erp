# 📘 Vendor Master - Complete User Guide
# विक्रेता प्रबंधन - पूर्ण उपयोगकर्ता गाइड

## 🎯 Overview / परिचय

Vendor Master आपके सभी suppliers (विक्रेताओं) का पूरा हिसाब-किताब रखता है। इससे आप:
- किसको कितना पैसा देना है - track कर सकते हैं
- सभी purchases का record रख सकते हैं
- Payment history देख सकते हैं
- Business को organized रख सकते हैं

---

## 🚀 Quick Start / शुरुआत कैसे करें

### Step 1: Add Your First Vendor / पहला विक्रेता जोड़ें

1. **"Add Vendor"** button पर click करें
2. भरें:
   - **Vendor Name** (जरूरी): जैसे "Rajesh Bullion Traders"
   - **Contact Number**: जैसे "9876543210"
   - **Vendor Type**: चुनें (Raw Material, Packaging, etc.)
   - **Address**: जैसे "Sarafa Bazaar, Indore"
   - **GST Number** (optional): अगर है तो
3. **"Save Vendor"** पर click करें

✅ **Done!** आपका पहला vendor add हो गया!

---

## 📦 Real-Life Example / असली उदाहरण

### Scenario: आप Jewellery Shop चलाते हैं

#### Example 1: सोना खरीदना (Purchase Entry)

**Situation**: आपने Rajesh Bullion से ₹5,00,000 का सोना खरीदा (उधार पर)

**Steps**:
1. Vendor dropdown से **"Rajesh Bullion Traders"** select करें
2. **"Purchase Entry"** button पर click करें
3. भरें:
   - Amount: `500000`
   - Description: `Gold 100gm purchase`
   - Bill Number: `RBT-123`
   - GST Amount: `15000` (if applicable)
4. **"Save Purchase"** पर click करें

**Result**: 
- System में automatically entry हो जाएगी
- "Pending Payable" में ₹5,15,000 दिखेगा
- आपको याद रहेगा कि Rajesh को कितना देना है

---

#### Example 2: Payment करना

**Situation**: महीने के अंत में आप Rajesh को ₹2,00,000 देते हैं

**Steps**:
1. Vendor dropdown से **"Rajesh Bullion Traders"** select करें
2. **"Pay Vendor"** button पर click करें
3. भरें:
   - Amount Paid: `200000`
   - Payment Mode: `Bank Transfer`
   - Note: `Partial payment for Bill RBT-123`
4. **"Save Payment"** पर click करें

**Result**:
- Payment record हो जाएगा
- "Pending Payable" अब ₹3,15,000 दिखेगा
- पूरा history ledger में save रहेगा

---

## 💡 Features Explained / सुविधाएं

### 1. **Vendor Types / विक्रेता के प्रकार**

| Type | Example | Use Case |
|------|---------|----------|
| **Raw Material** | Rajesh Bullion | सोना, चांदी खरीदना |
| **Packaging** | Perfect Packaging | बॉक्स, पाउच खरीदना |
| **Tools & Equipment** | Sharma Hardware | औजार, मशीन खरीदना |
| **Office Supplies** | Gupta Stationery | कागज, पेन खरीदना |
| **Services** | CA Verma & Associates | Accounting services |

### 2. **Summary Cards / सारांश**

#### 📦 Total Purchased (उधार लिया)
- आपने vendor से कितना सामान लिया (credit)
- Red color में दिखता है (यह आपका debt है)

#### 💰 Total Paid (भुगतान किया)
- आपने vendor को कितना पैसा दिया
- Green color में दिखता है (यह अच्छा है)

#### ⚠️ Pending Payable (बाकी)
- अभी कितना देना बाकी है
- Orange/Yellow में highlight होता है
- **यह सबसे important number है!**

### 3. **Transaction History / लेनदेन का इतिहास**

हर entry में दिखता है:
- **Date**: कब हुआ
- **Description**: क्या हुआ
- **Purchased (Cr)**: कितना सामान लिया
- **Paid (Dr)**: कितना payment किया

---

## 🎯 Common Use Cases / आम उपयोग

### Use Case 1: Monthly Settlement

**हर महीने के अंत में**:
1. सभी vendors को एक-एक करके select करें
2. "Pending Payable" देखें
3. Priority के हिसाब से payment करें:
   - High Priority: जिसका ज्यादा बाकी है
   - Medium: जिसके साथ regular business है
   - Low: जो wait कर सकता है

### Use Case 2: Year-End Analysis

**साल के अंत में**:
1. हर vendor का total purchased देखें
2. पता करें कौन सा vendor सबसे ज्यादा supply करता है
3. अगले साल के लिए planning करें

### Use Case 3: Dispute Resolution

**अगर vendor कहे "आपने payment नहीं किया"**:
1. Vendor select करें
2. Transaction history दिखाएं
3. Exact date और amount proof के साथ दिखाएं

---

## 📊 Best Practices / सर्वोत्तम तरीके

### ✅ DO's (करें):

1. **हर purchase को तुरंत entry करें**
   - जैसे ही सामान लें, entry कर दें
   - Bill number जरूर डालें

2. **Payment के साथ note लिखें**
   - किस bill का payment है
   - कोई special terms हैं तो

3. **Regular reconciliation करें**
   - महीने में एक बार vendor से match करें
   - अगर कोई difference है तो तुरंत ठीक करें

4. **Contact details update रखें**
   - Phone number change हो तो update करें
   - Address बदले तो update करें

### ❌ DON'Ts (न करें):

1. **Entry को pending न छोड़ें**
   - "बाद में करूंगा" - यह गलत है
   - तुरंत entry करें

2. **Vendor delete न करें अगर transactions हैं**
   - पहले सारा हिसाब clear करें
   - फिर ही delete करें

3. **Duplicate vendors न बनाएं**
   - "Rajesh Bullion" और "Rajesh Traders" अलग-अलग न बनाएं
   - एक ही vendor एक बार

---

## 🔄 Complete Workflow / पूरा प्रवाह

```
1. VENDOR ADD करें
   ↓
2. PURCHASE ENTRY करें (जब सामान लें)
   ↓
3. LEDGER CHECK करें (कितना बाकी है)
   ↓
4. PAYMENT करें (जब पैसे दें)
   ↓
5. REPEAT (हर transaction के लिए)
```

---

## 💼 Business Benefits / व्यापार के फायदे

### 1. **Better Cash Flow Management**
- पता रहता है कितना cash निकालना है
- कब payment करना है - plan कर सकते हैं

### 2. **Improved Vendor Relations**
- Timely payment से vendor खुश रहते हैं
- Better credit terms मिल सकते हैं
- Discount मिल सकता है

### 3. **Tax Benefits**
- सभी purchases properly recorded
- GST input credit मिल जाता है
- Tax filing आसान हो जाती है

### 4. **Business Insights**
- कौन सा vendor सबसे reliable है
- किससे सबसे ज्यादा खरीदते हैं
- Cost optimization के लिए data मिलता है

### 5. **Professional Image**
- Organized business दिखता है
- Banks से loan लेने में आसानी
- Investors को impress करता है

---

## 🎓 Training Tips / प्रशिक्षण टिप्स

### For New Users / नए उपयोगकर्ताओं के लिए:

**Week 1**: 
- सभी existing vendors add करें
- Contact details भरें

**Week 2**:
- पुराने pending payments entry करें
- Current balance set करें

**Week 3**:
- नए purchases entry करना शुरू करें
- Daily practice करें

**Week 4**:
- Monthly report देखें
- Vendors को reconcile करें

---

## 🆘 Troubleshooting / समस्या समाधान

### Problem 1: "Balance गलत दिख रहा है"
**Solution**: 
- सभी transactions check करें
- कोई duplicate entry तो नहीं
- Vendor से physically match करें

### Problem 2: "Vendor delete नहीं हो रहा"
**Solution**:
- पहले सारे transactions clear करें
- Balance zero होना चाहिए
- फिर delete करें

### Problem 3: "Purchase entry कैसे करें?"
**Solution**:
1. Vendor select करें
2. "Purchase Entry" button पर click करें
3. Amount और description भरें
4. Save करें

---

## 📞 Support / सहायता

अगर कोई problem आए:
1. इस guide को फिर से पढ़ें
2. Examples को follow करें
3. Step-by-step करें

---

## 🎯 Summary / सारांश

**Vendor Master = आपके business का backbone**

- ✅ सभी vendors का complete record
- ✅ Purchase और payment tracking
- ✅ Pending payables का clear view
- ✅ Professional business management
- ✅ Tax और compliance में आसानी

**Start करें आज से!** 🚀

---

*Last Updated: February 2026*
*Version: 2.0 - Complete Rewrite with Hindi Support*
