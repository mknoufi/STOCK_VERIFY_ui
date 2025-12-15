# Guide: Native Windows Deployment for Stock Verify

This guide provides instructions for setting up and running the Stock Verify application natively on a Windows PC without using Docker.

**Please follow these steps exactly.**

---

### **Step 1: Prepare Your Deployment Folder**

1.  **Create a new folder** on your PC. A good location would be `C:\StockVerify_Prod\`.
2.  **Copy the following items from the project into your new folder:**
    *   The `backend` folder.
    *   The `frontend` folder.
    *   The `start_production.ps1` script.
    *   The `windows_deployment_backend.env.example` file.
    *   The `windows_deployment_frontend.env.example` file.

---

### **Step 2: Install Prerequisites**

If you don't have these installed already, please install them.

1.  **Python (3.9+):**
    *   Download from [python.org](https://python.org/).
    *   **Important:** During installation, make sure to check the box that says **"Add Python to PATH"**.

2.  **Node.js (LTS version):**
    *   Download from [nodejs.org](https://nodejs.org/).

3.  **MongoDB Community Server:**
    *   Download from the [MongoDB website](https://www.mongodb.com/try/download/community).
    *   During installation, configure it to **run as a network service**.
    *   After installation, verify the service is running and named `MongoDB` in the Windows "Services" app. The startup script depends on this name.

4.  **http-server (for Frontend):**
    *   Open a new PowerShell terminal **as an Administrator**.
    *   Run this command:
        ```powershell
        npm install -g http-server
        ```

---

### **Step 3: Configure Your Environment**

In the folder you created (`C:\StockVerify_Prod\`):

1.  **Backend Configuration:**
    *   Rename `windows_deployment_backend.env.example` to `.env`.
    *   Open the new `.env` file in a text editor.
    *   Fill in the required values, especially `JWT_SECRET` and `JWT_REFRESH_SECRET` with strong, random strings.
    *   The default `MONGO_URL` should work if you installed MongoDB locally.

2.  **Frontend Configuration:**
    *   Go into the `frontend` directory inside your new folder.
    *   Rename `windows_deployment_frontend.env.example` to `.env.production`. (Note the different name for the frontend).
    *   Open it and ensure `EXPO_PUBLIC_API_URL` is set to your backend's address (e.g., `http://localhost:8000`).

---

### **Step 4: Install Application Dependencies**

1.  Open a PowerShell terminal in your deployment folder (`C:\StockVerify_Prod\`).
2.  **Install Backend Dependencies:**
    ```powershell
    cd backend
    pip install -r requirements.txt
    cd ..
    ```
3.  **Install Frontend Dependencies:**
    ```powershell
    cd frontend
    npm install
    ```

---

### **Step 5: Build the Frontend**

This step bundles the frontend code into a static `build` folder that can be served by `http-server`.

1.  While still in the `frontend` directory in PowerShell, run:
    ```powershell
    npm run build
    cd ..
    ```

---

### **Step 6: Run the Application**

1.  You should now be back in the root of your deployment folder (`C:\StockVerify_Prod\`).
2.  Open a new PowerShell terminal **as an Administrator**.
3.  Execute the startup script:
    ```powershell
    .\start_production.ps1
    ```
    This will start the MongoDB service, the backend server, and the frontend server.

### **Step 7: Access Your Application**

*   **Frontend:** Open your web browser to **`http://localhost:3000`**.
*   **Backend API:** The backend will be running on **`http://localhost:8000`**.

To stop the servers, you will need to close the terminal windows that `start_production.ps1` opened.
