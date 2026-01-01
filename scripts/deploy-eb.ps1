# AWS Elastic Beanstalk Deployment Script for CivBuilder
# This script builds the frontend and packages the application for EB.

$AppName = "CivBuilder"
$EnvironmentName = "CivBuilder-env"
$Region = "us-east-1" # Change this to your preferred region
$VersionLabel = "v" + (Get-Date -Format "yyyyMMddHHmmss")
$ZipFile = "deploy.zip"

Write-Host "Step 1: Building frontend..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "Step 2: Packaging application..." -ForegroundColor Cyan
if (Test-Path $ZipFile) { Remove-Item $ZipFile }

# Create a temporary directory for staging
$StageDir = "deploy_stage"
if (Test-Path $StageDir) { Remove-Item -Recurse -Force $StageDir }
New-Item -ItemType Directory -Path $StageDir

# Copy necessary files
Copy-Item -Path "server" -Destination "$StageDir/server" -Recurse
New-Item -ItemType Directory -Path "$StageDir/src"
Copy-Item -Path "src/core" -Destination "$StageDir/src/core" -Recurse
Copy-Item -Path "dist" -Destination "$StageDir/dist" -Recurse
Copy-Item -Path "data" -Destination "$StageDir/data" -Recurse
Copy-Item -Path "package.json" -Destination "$StageDir/"
Copy-Item -Path "package-lock.json" -Destination "$StageDir/"
Copy-Item -Path "Procfile" -Destination "$StageDir/"
Copy-Item -Path ".ebextensions" -Destination "$StageDir/.ebextensions" -Recurse

# Create the zip
Compress-Archive -Path "$StageDir/*" -DestinationPath $ZipFile

# Clean up stage
Remove-Item -Recurse -Force $StageDir

Write-Host "Step 3: Deployment instructions" -ForegroundColor Cyan
Write-Host "Your deployment package is ready: $ZipFile"
Write-Host ""
Write-Host "To deploy using AWS CLI, run these commands:"
Write-Host "1. Upload to S3 (replace <your-bucket-name>):"
Write-Host "   aws s3 cp $ZipFile s3://<your-bucket-name>/$ZipFile"
Write-Host ""
Write-Host "2. Create application version:"
Write-Host "   aws elasticbeanstalk create-application-version --application-name $AppName --version-label $VersionLabel --source-bundle S3Bucket=<your-bucket-name>,S3Key=$ZipFile"
Write-Host ""
Write-Host "3. Update environment:"
Write-Host "   aws elasticbeanstalk update-environment --environment-name $EnvironmentName --version-label $VersionLabel"
Write-Host ""
Write-Host "Note: Make sure you have set up your DATABASE_URL environment variable in the EB console."
