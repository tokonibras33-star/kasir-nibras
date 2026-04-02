# **App Name**: RetailFlow

## Core Features:

- User Authentication & Authorization: Secure login system utilizing Firebase Auth, implementing role-based access for ADMIN, KASIR_TOKO_A, and KASIR_TOKO_B roles.
- Product Management: An administrative interface enabling product listing, addition, editing, and deletion. Includes details like product name, category, price, and total stock.
- Inventory & Stock Control: Admin module for detailed stock oversight, showing inventory per store (Toko A, Toko B), supporting stock additions, and facilitating stock transfers between stores. Includes low stock notifications (< 5 items).
- Sales Transaction System (POS): A cashier-focused point-of-sale interface allowing product search, adding items to a shopping cart, quantity adjustments, processing payments, stock validation, and recording transactions to the database. Features include loading states for seamless transactions.
- Sales Reporting & Analytics: Admin dashboard providing vital business insights: daily sales, total transactions, low stock alerts, sales comparisons between Toko A and Toko B, a filterable list of transactions, sales graphs, and monthly/daily recaps of top-selling products.
- Admin User Management: Administrator capabilities to manage user accounts, including the creation, modification, and deletion of cashier profiles.
- Responsive & Mobile-First UI: The application's design is optimized for mobile-first access, adapting product grids to two columns on smaller screens and dynamically positioning the shopping cart to the bottom for improved usability.

## Style Guidelines:

- Primary color: Muted deep emerald (#33997F). This sophisticated hue provides a professional and clean base, ensuring strong contrast for text on light backgrounds.
- Background color: Very light, subtle emerald tint (#F9FCFB). This nearly-white shade maintains a minimalist aesthetic while offering a touch of color coherence.
- Accent color: Vibrant green (#4CD964). Used sparingly for critical call-to-action elements, such as the 'BAYAR' button, to draw attention and provide clear interaction cues.
- Headline and body font: 'Inter' (sans-serif). Chosen for its modern, clean lines, and excellent readability across all screen sizes, perfectly suiting a professional dashboard.
- Utilize minimalist line-art icons that complement the application's clean, modern, and professional visual language without distracting the user.
- Implement a card-based UI design with soft shadows (soft shadow) and a border-radius of 12px for all interactive and display elements, promoting a contemporary and user-friendly experience.
- Subtle loading state animations for data processing and clear disabled states for buttons to offer immediate visual feedback to the user during asynchronous operations.