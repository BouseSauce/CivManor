# AWS Elastic Beanstalk Deployment Guide

This application is configured for deployment to AWS Elastic Beanstalk (EB) using the Node.js platform.

## Prerequisites

1. **AWS CLI**: Installed and configured with appropriate permissions.
2. **PostgreSQL**: An RDS instance or any PostgreSQL database accessible from EB.
3. **S3 Bucket**: A bucket to store your deployment packages.

## Deployment Steps

1. **Prepare the Environment**:
   - Create a new Elastic Beanstalk application.
   - Create a new environment using the **Node.js 20** (or 18) platform.
   - In the environment configuration, set the following environment variables:
     - `NODE_ENV`: `production`
     - `PORT`: `8080`
     - `DATABASE_URL`: Your PostgreSQL connection string (e.g., `postgres://user:password@host:5432/dbname`)

2. **Run the Deployment Script**:
   Open PowerShell and run:
   ```powershell
   .\scripts\deploy-eb.ps1
   ```
   This will:
   - Build the frontend (`npm run build`).
   - Package the server, frontend, and core logic into `deploy.zip`.

3. **Upload and Deploy**:
   Follow the instructions printed by the script to upload the `deploy.zip` to S3 and update your EB environment.

## Project Structure for EB

The deployment package (`deploy.zip`) contains:
- `server/`: Backend Express server.
- `src/core/`: Shared game logic used by both frontend and backend.
- `dist/`: Built frontend assets.
- `package.json` & `package-lock.json`: Dependency definitions.
- `Procfile`: Tells EB how to start the server.
- `.ebextensions/`: EB-specific configuration.

## Troubleshooting

- **Database Connection**: Ensure your EB environment's security group allows outbound traffic to your database and the database security group allows inbound traffic from EB.
- **Logs**: Use `aws eb logs` or the AWS Console to check for errors if the application fails to start.
