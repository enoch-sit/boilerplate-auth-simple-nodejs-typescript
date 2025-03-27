# Simple Authentication System with TypeScript and MongoDB

A robust authentication system built with TypeScript, Express, and MongoDB. Features include user registration, email verification, JWT authentication, password reset, and protected routes.

## Features

- **User Registration**: Secure signup with email verification
- **JWT Authentication**: Access and refresh tokens with expiration
- **Email Integration**: Verification emails and password reset functionality
- **Protected Routes**: Middleware for authenticated endpoints
- **Password Management**: Secure hashing and reset functionality
- **Database Integration**: MongoDB for data persistence

### Setting Up MongoDB on Windows

1. **Download and Install MongoDB**:
   - Visit the MongoDB download page and download the latest version for Windows.
   - Follow the installation instructions to install MongoDB Community Server.

2. **Start MongoDB Service**:
   - Open Command Prompt as Administrator.
   - Navigate to the MongoDB bin directory (e.g., `C:\Program Files\MongoDB\Server\6.0\bin`).
   - Run `mongod --dbpath C:\data\db` to start the MongoDB server.

3. **Test Connection**:
   - Open another Command Prompt.
   - Run `mongo` to connect to the MongoDB shell.
   - Use `show dbs` to list databases and confirm the connection.

### Setting Up MongoDB on Linux

1. **Install MongoDB**:
   - For Ubuntu/Debian:

     ```bash
     sudo apt-get install -y mongodb-org
     ```

   - For CentOS/RHEL:

     ```bash
     sudo yum install -y mongodb-org
     ```

2. **Start MongoDB Service**:
   - Start the service with:

     ```bash
     sudo systemctl start mongod
     ```

   - Enable MongoDB to start on boot:

     ```bash
     sudo systemctl enable mongod
     ```

3. **Test Connection**:
   - Connect to MongoDB with:

     ```bash
     mongo
     ```

   - Use `show dbs` to list databases and confirm the connection.

### Setting Up MongoDB on AWS

1. **Create an Amazon DocumentDB Cluster**:
   - Navigate to the AWS Management Console.
   - Go to the Amazon DocumentDB service.
   - Create a new cluster, choosing instance type and other settings as needed.

2. **Connect to DocumentDB**:
   - Use the AWS CLI or SDK to connect to your DocumentDB cluster.
   - Example connection string:

     ```bash
     mongodb://username:password@docdb-2025-03-27.cluster-c123456789abcdef0.c123456789abcdef0.docdb.amazonaws.com:27017/?ssl=true&ssl_ca_certs=rds-combined-ca-bundle.pem
     ```

3. **Test Connection**:
   - Use a MongoDB client or the `mongo` shell to connect to your DocumentDB instance.
   - Use `show dbs` to list databases and confirm the connection.

- **Environment Configuration**: Separate settings for development and production

## Technologies

- **Backend**: Node.js, Express
- **Language**: TypeScript
- **Database**: MongoDB, Mongoose
- **Authentication**: JSON Web Tokens (JWT)
- **Email**: Nodemailer (MailHog for development, AWS SES for production)
- **Security**: Helmet, rate limiting, CORS
- **Logging**: Winston

## Quick Start

### Prerequisites

• Node.js (v18+)
• MongoDB (Local or Atlas)
• npm

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/enoch-sit/boilerplate-auth-simple-nodejs-typescript.git
   cd boilerplate-auth-simple-nodejs-typescript
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:
   • Create `.env.development` and `.env.production` files in the root directory.
   • Use the templates provided in the project documentation.

4. **Start the development server**:

   ```bash
   npm run dev
   ```

## Configuration

### Environment Variables

| Variable                | Description                          | Example                   |
|-------------------------|--------------------------------------|---------------------------|
| `MONGO_URI`             | MongoDB connection string            | `mongodb://localhost:27017/auth` |
| `JWT_ACCESS_SECRET`     | Secret key for access tokens         | `your_access_secret`      |
| `JWT_REFRESH_SECRET`    | Secret key for refresh tokens        | `your_refresh_secret`     |
| `EMAIL_HOST`            | SMTP server host                     | `smtp.mailservice.com`    |
| `EMAIL_PORT`            | SMTP server port                     | `587`                     |
| `EMAIL_USER`            | SMTP username                        | `user@example.com`        |
| `EMAIL_PASS`            | SMTP password                        | `password123`            |

### Email Setup

• **Development**: Use MailHog (included in Docker setup)

  ```bash
  docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
  ```

• **Production**: Configure AWS SES or another SMTP service.

## API Endpoints

| Endpoint                | Method | Description                     |
|-------------------------|--------|---------------------------------|
| `/api/auth/signup`      | POST   | Register a new user             |
| `/api/auth/login`       | POST   | Login with credentials          |
| `/api/auth/refresh`     | POST   | Refresh access token            |
| `/api/auth/verify-email`| POST   | Verify email with token         |
| `/api/profile`         | GET    | Get user profile (Protected)    |
| `/api/reset-password`   | POST   | Reset password with token       |

## Testing

### Register a User

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Password123!"}'
```

### Verify Email (Check MailHog UI at `http://localhost:8025`)

```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"ABC123"}'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Password123!"}'
```

### Access Protected Route

```bash
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Deployment

### Production Considerations

1. **Database**: Use MongoDB Atlas for a managed MongoDB service.
2. **Email**: Configure AWS SES in `.env.production`.
3. **HTTPS**: Use a reverse proxy (Nginx) or cloud provider (AWS, Heroku).
4. **Environment Variables**: Store secrets securely (e.g., AWS Secrets Manager).

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## License

MIT License. See `LICENSE` for details.
