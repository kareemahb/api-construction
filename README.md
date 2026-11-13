# 🏗️ Construction Checker
 
A front-end app for people in the trades (construction, HVAC, plumbing, and so on). Enter a ZIP code before a job to check home safety information for that area.
 

<img width="1430" height="949" alt="image" src="https://github.com/user-attachments/assets/5382d4bc-ce44-4292-b608-e96c50eed15d" />

 
🔗 **Live Demo:** [kareemahb.github.io/api-construction](https://kareemahb.github.io/api-construction/)
 

 
## ✨ Planned Features
 
- **ZIP code search**: enter a 5-digit ZIP code and click **Check Area**
- **Area safety score**: show safety information for that ZIP code from an API
- **Error handling**: a clear message when no information is found for a ZIP code

 
## 🧱 Current Status
 
| Part | Status |
| --- | --- |
| Page layout and ZIP code form (`index.html`) | ✅ Done |
| `ZipCheckupAPI` class with `getSafeyScore()` | ✅ Started |
| API base URL | ⬜ Still to add |
| `ConstructionCheckApp`: form submit handling | ⬜ Still to add |
| Showing results in `#results` | ⬜ Still to add |
| Styling (`main.css`) | ⬜ Still to add |
 

 
## 🔍 How It Will Work
 
```
ZIP code ──▶ ZipCheckupAPI.getSafeyScore() ──▶ GET {baseURL}/zip/{zip}/score ──▶ results section
```
 
The code is organized into two classes in `main.js`:
 
| Class | Job |
| --- | --- |
| `ZipCheckupAPI` | Calls the API and returns the score data, or throws an error if the ZIP code isn't found |
| `ConstructionCheckApp` | Will handle the form, call the API class, and show the results |
 

 
## 🛠️ Tech Stack
 
- HTML5
- CSS3
- JavaScript (ES6 classes, `async`/`await`, Fetch API)
No frameworks, dependencies, or build tools.
 

 
## 📁 Project Structure
 
```
api-construction/
├── index.html   # Header, ZIP code form, and results section
├── main.css     # Styling
└── main.js      # ZipCheckupAPI and ConstructionCheckApp classes
```
 

 
## 🚀 Getting Started
 
Try it live on **[GitHub Pages](https://kareemahb.github.io/api-construction/)**, or run it locally:
 
```bash
git clone https://github.com/kareemahb/api-construction.git
cd api-construction
```
 
Open `index.html` in your browser, or use the **Live Server** extension in VS Code.
 

 
## 👩‍💻 Created By
 
**Kareemah Bahaadur**
[GitHub](https://github.com/kareemahb)
