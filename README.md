# Karibu Groceries System (Frontend)

This is the frontend application for the Karibu Groceries System, a comprehensive management tool designed for grocery businesses. Built with Vue 3 and Vite, it provides tailored dashboards for Directors, Managers, and Sales Agents to efficiently handle sales, stock, and administrative tasks.

## Features

### Role-Based Dashboards
- **Director**:
  - **Dashboard**: High-level metrics on total sales, stock, and credit.
  - **Sales Overview**: Detailed reports on cash and credit sales across all branches.
  - **Stock Overview**: Monitor stock levels and distribution.
  - **Credit Overview**: Track outstanding debts and payment status.
  - **Administration**: Manage users (Sales Agents, Managers) and Branches.

- **Manager**:
  - **Stock Management**: Record new procurement and manage inventory.
  - **Reporting**: View stock levels and low-stock alerts.

- **Sales Agent**:
  - **Point of Sale**: Record Cash and Credit sales.
  - **Stock View**: Check available produce and prices in real-time.
  - **My Sales**: Track personal sales history and print receipts.

## Tech Stack

- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **State Management**: Pinia
- **Routing**: Vue Router
- **HTTP Client**: Axios
- **Charts**: Chart.js

## Setup & Installation

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Configuration**:
    Ensure your backend server is running (default port 7000). You can configure the API URL in `.env.local` if needed.

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

4.  **Build for production**:
    ```bash
    npm run build
    ```