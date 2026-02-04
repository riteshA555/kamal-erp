# 🧪 Vendor Master - Complete Testing Guide
# विक्रेता प्रबंधन - पूर्ण परीक्षण गाइड

## 📋 **Test Checklist / परीक्षण सूची**

---

## ✅ **TEST 1: Add New Vendor (Basic)**

### Steps:
1. Go to **Vendor Master (Suppliers)**
2. Click **"Add Vendor"** button
3. Fill ONLY required field:
   - **Vendor Name**: `Test Vendor 1`
4. Click **"Save Vendor"**

### Expected Result:
- ✅ Success message: "Vendor Successfully Created!"
- ✅ Vendor appears in dropdown
- ✅ Form closes automatically

### Status: ✅ PASS / ❌ FAIL

---

## ✅ **TEST 2: Add Vendor (Complete Details)**

### Steps:
1. Click **"Add Vendor"**
2. Fill ALL fields:
   ```
   Vendor Name: Rajesh Bullion Traders
   Contact: 9876543210
   Vendor Type: Raw Material
   Address: Sarafa Bazaar, Indore, MP
   GST Number: 23AAAAA0000A1Z5
   ```
3. Click **"Save Vendor"**

### Expected Result:
- ✅ Vendor created successfully
- ✅ All details saved
- ✅ Appears in dropdown

### Status: ✅ PASS / ❌ FAIL

---

## ✅ **TEST 3: Purchase Entry (Without GST)**

### Steps:
1. Select vendor: **"Rajesh Bullion Traders"**
2. Click **"Purchase Entry"** button
3. Fill form:
   ```
   Purchase Amount: 50000
   Description: Gold 10gm purchase
   Bill Number: RBT-001
   GST Amount: (leave empty)
   ```
4. Check Total Amount shows: **₹50,000**
5. Click **"Save Purchase"**

### Expected Result:
- ✅ Success message shown
- ✅ Ledger updates:
  - 📦 Total Purchased: ₹50,000
  - 💰 Total Paid: ₹0
  - ⚠️ Pending: ₹50,000
- ✅ Transaction appears in table with:
  - Description: "Purchase: Gold 10gm purchase (Bill #RBT-001)"
  - Purchased (Cr): ₹50,000
  - Paid (Dr): -

### Status: ✅ PASS / ❌ FAIL

---

## ✅ **TEST 4: Purchase Entry (With GST)**

### Steps:
1. Vendor selected: **"Rajesh Bullion Traders"**
2. Click **"Purchase Entry"**
3. Fill form:
   ```
   Purchase Amount: 100000
   Description: Silver 50gm purchase
   Bill Number: RBT-002
   GST Amount: 3000
   ```
4. Check Total Amount shows: **₹1,03,000**
5. Click **"Save Purchase"**

### Expected Result:
- ✅ Total = ₹1,00,000 + ₹3,000 = ₹1,03,000
- ✅ Ledger updates:
  - 📦 Total Purchased: ₹1,53,000 (50k + 103k)
  - 💰 Total Paid: ₹0
  - ⚠️ Pending: ₹1,53,000
- ✅ New transaction in table

### Status: ✅ PASS / ❌ FAIL

---

## ✅ **TEST 5: Make Payment (Partial)**

### Steps:
1. Vendor selected: **"Rajesh Bullion Traders"**
2. Click **"Pay Vendor"** button
3. Fill form:
   ```
   Amount Paid: 50000
   Payment Mode: Cash
   Note: Partial payment for RBT-001
   ```
4. Click **"Save Payment"**

### Expected Result:
- ✅ Success message
- ✅ Ledger updates:
  - 📦 Total Purchased: ₹1,53,000 (unchanged)
  - 💰 Total Paid: ₹50,000 (NEW!)
  - ⚠️ Pending: ₹1,03,000 (153k - 50k)
- ✅ Payment transaction in table:
  - Description: "Partial payment for RBT-001"
  - Purchased (Cr): -
  - Paid (Dr): ₹50,000

### Status: ✅ PASS / ❌ FAIL

---

## ✅ **TEST 6: Make Payment (Full Settlement)**

### Steps:
1. Click **"Pay Vendor"**
2. Fill:
   ```
   Amount Paid: 103000
   Payment Mode: Bank Transfer
   Note: Full settlement
   ```
3. Click **"Save Payment"**

### Expected Result:
- ✅ Ledger updates:
  - 📦 Total Purchased: ₹1,53,000
  - 💰 Total Paid: ₹1,53,000 (50k + 103k)
  - ⚠️ Pending: ₹0 (ZERO!)

### Status: ✅ PASS / ❌ FAIL

---

## ✅ **TEST 7: Delete Vendor (With Transactions) - Should FAIL**

### Steps:
1. Select vendor: **"Rajesh Bullion Traders"**
2. Click **"Delete"** button
3. Confirm deletion

### Expected Result:
- ❌ Error message should appear:
  ```
  ❌ Cannot delete! This vendor has 4 transaction(s).
  
  📊 Balance: ₹0
  
  ⚠️ इस विक्रेता के 4 लेनदेन हैं।
  बैलेंस: ₹0
  
  To delete:
  1. Clear all dues (make balance ₹0)
  2. Or contact support for force delete
  ```
- ❌ Vendor should NOT be deleted
- ✅ Vendor still appears in dropdown

### Status: ✅ PASS / ❌ FAIL

---

## ✅ **TEST 8: Delete Vendor (No Transactions) - Should PASS**

### Steps:
1. Click **"Add Vendor"**
2. Create: `Test Delete Vendor`
3. Save
4. Select this vendor
5. Click **"Delete"**
6. Confirm

### Expected Result:
- ✅ Vendor deleted successfully
- ✅ Removed from dropdown
- ✅ No error message

### Status: ✅ PASS / ❌ FAIL

---

## ✅ **TEST 9: Multiple Vendors**

### Steps:
1. Add 3 vendors:
   - `Perfect Packaging Co.`
   - `Sharma Hardware`
   - `Gupta Stationery`
2. Add purchase entry for each (₹10,000 each)
3. Check all vendors in dropdown

### Expected Result:
- ✅ All 4 vendors visible (including Rajesh Bullion)
- ✅ Each vendor has independent ledger
- ✅ Totals don't mix between vendors

### Status: ✅ PASS / ❌ FAIL

---

## ✅ **TEST 10: UI/UX Check**

### Checklist:
- ✅ Hindi + English labels visible
- ✅ Icons showing correctly
- ✅ Colors:
  - Red for Purchased
  - Green for Paid
  - Orange for Pending
- ✅ Numbers formatted as ₹1,00,000 (Indian format)
- ✅ Modals open/close properly
- ✅ Forms clear after submit
- ✅ Responsive on mobile

### Status: ✅ PASS / ❌ FAIL

---

## 📊 **GST Explanation / GST की व्याख्या**

### **What is GST? / GST क्या है?**

**GST = Goods and Services Tax (वस्तु एवं सेवा कर)**

यह एक tax है जो government को देना पड़ता है जब आप कुछ खरीदते या बेचते हैं।

---

### **GST in Vendor Master / विक्रेता में GST**

#### **Scenario 1: Purchase WITHOUT GST**
```
Gold Purchase: ₹1,00,000
GST: ₹0
---
Total: ₹1,00,000 (vendor को देना है)
```

#### **Scenario 2: Purchase WITH GST**
```
Gold Purchase: ₹1,00,000
GST @ 3%: ₹3,000
---
Total: ₹1,03,000 (vendor को देना है)
```

---

### **GST Input vs Output / GST इनपुट बनाम आउटपुट**

#### **INPUT GST (जो आप भरते हैं)**
- **When**: जब आप सामान खरीदते हैं
- **Example**: Vendor से gold खरीदा
  ```
  Amount: ₹1,00,000
  GST: ₹3,000
  Total Paid: ₹1,03,000
  ```
- **Benefit**: यह ₹3,000 आप government से वापस ले सकते हैं!
- **Called**: **INPUT TAX CREDIT**

#### **OUTPUT GST (जो आप लेते हैं)**
- **When**: जब आप सामान बेचते हैं
- **Example**: Customer को jewelry बेची
  ```
  Sale Amount: ₹2,00,000
  GST @ 3%: ₹6,000
  Total Received: ₹2,06,000
  ```
- **Duty**: यह ₹6,000 आपको government को देना है

---

### **GST Settlement / GST का हिसाब**

```
OUTPUT GST (collected): ₹6,000
INPUT GST (paid): ₹3,000
---
Net GST to Government: ₹3,000 (6k - 3k)
```

**Matlab**: 
- आपने customer से ₹6,000 GST लिया
- आपने vendor को ₹3,000 GST दिया
- बाकी ₹3,000 government को देना है

---

### **Why Track GST in Vendor Master?**

1. **Input Tax Credit**: जितना GST vendors को दिया, उतना claim कर सकते हैं
2. **Proper Records**: Tax filing के लिए सही records
3. **Compliance**: Government rules follow करने के लिए
4. **Savings**: GST credit से पैसे बचते हैं

---

### **Real Example / असली उदाहरण**

#### **Month: January 2026**

**Purchases (Input GST)**:
```
Rajesh Bullion: ₹1,00,000 + GST ₹3,000 = ₹1,03,000
Perfect Packaging: ₹10,000 + GST ₹1,800 = ₹11,800
---
Total Input GST: ₹4,800
```

**Sales (Output GST)**:
```
Customer A: ₹2,00,000 + GST ₹6,000 = ₹2,06,000
Customer B: ₹1,50,000 + GST ₹4,500 = ₹1,54,500
---
Total Output GST: ₹10,500
```

**GST to Pay Government**:
```
Output GST: ₹10,500
Input GST: ₹4,800
---
Net Payable: ₹5,700
```

**Benefit of Tracking**:
- Without tracking: Pay ₹10,500
- With tracking: Pay only ₹5,700
- **Savings: ₹4,800!** 💰

---

## 🎯 **Testing Summary / परीक्षण सारांश**

### **Total Tests**: 10

| Test | Feature | Status |
|------|---------|--------|
| 1 | Add Vendor (Basic) | ⬜ |
| 2 | Add Vendor (Complete) | ⬜ |
| 3 | Purchase (No GST) | ⬜ |
| 4 | Purchase (With GST) | ⬜ |
| 5 | Payment (Partial) | ⬜ |
| 6 | Payment (Full) | ⬜ |
| 7 | Delete (With Txn) | ⬜ |
| 8 | Delete (No Txn) | ⬜ |
| 9 | Multiple Vendors | ⬜ |
| 10 | UI/UX Check | ⬜ |

---

## 📝 **Notes / टिप्पणियां**

### **Common Issues / आम समस्याएं**:

1. **Vendor delete nahi ho raha**
   - ✅ CORRECT behavior!
   - Transactions clear karne ke baad hi delete hoga

2. **GST amount kahan add karein?**
   - Purchase Entry में separate field hai
   - Total automatically calculate hota hai

3. **Balance galat dikh raha hai**
   - Sab transactions check karein
   - Refresh page karein

---

## ✅ **Final Checklist**

Before going live:
- [ ] All 10 tests passed
- [ ] GST calculations correct
- [ ] Delete protection working
- [ ] UI looks professional
- [ ] Hindi labels visible
- [ ] Mobile responsive
- [ ] No console errors

---

**Testing Date**: __________
**Tested By**: __________
**Result**: ✅ PASS / ❌ FAIL

---

*Last Updated: February 2026*
*Version: 2.0*
