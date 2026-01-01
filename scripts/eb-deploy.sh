#!/usr/bin/env bash
set -euo pipefail

BUCKET_NAME="elasticbeanstalk-ap-southeast-2-805530280791"
if [ $# -ge 1 ]; then BUCKET_NAME="$1"; fi
APP_NAME="Sovereign"
ENV_NAME="Sovereign-env"
REGION="ap-southeast-2"
PROFILE=""
VERSION_LABEL="v$(date +%Y%m%d%H%M%S)"
SOLUTION_STACK_NAME="64bit Amazon Linux 2 v5.15.7 running Node.js 18"
INSTANCE_PROFILE="aws-elasticbeanstalk-ec2-role2"

if [ -z "$BUCKET_NAME" ]; then
  echo "Usage: $0 <s3-bucket> [aws-profile]"
  exit 1
fi
if [ $# -ge 2 ]; then PROFILE="--profile $2"; fi

# Build & package (call existing PowerShell packager on Windows, or reuse deploy logic)
echo "Building frontend..."
npm run build

if [ ! -f dist/index.html ]; then
  echo "Build output not found in dist/. Aborting."
  exit 1
fi

# Prepare stage
STAGE_DIR="deploy_stage"
ZIP_FILE="deploy.zip"
rm -rf "$STAGE_DIR" "$ZIP_FILE"
mkdir -p "$STAGE_DIR"
cp -r server "$STAGE_DIR/"
mkdir -p "$STAGE_DIR/src"
cp -r src/core "$STAGE_DIR/src/core"
cp -r dist "$STAGE_DIR/dist"
cp package.json package-lock.json Procfile "$STAGE_DIR/"
cp -r .ebextensions "$STAGE_DIR/.ebextensions" || true

zip -r "$ZIP_FILE" "$STAGE_DIR"/*
rm -rf "$STAGE_DIR"

# Upload to S3
echo "Uploading $ZIP_FILE to s3://$BUCKET_NAME/$ZIP_FILE"
aws s3 cp "$ZIP_FILE" "s3://$BUCKET_NAME/$ZIP_FILE" --region "$REGION" $PROFILE

# Ensure application exists
echo "Ensuring Elastic Beanstalk application '$APP_NAME' exists..."
APP_DESC=$(aws elasticbeanstalk describe-applications --application-names "$APP_NAME" --region "$REGION" $PROFILE --output text || true)
if [ -z "$APP_DESC" ]; then
  echo "Application '$APP_NAME' not found; creating it..."
  aws elasticbeanstalk create-application --application-name "$APP_NAME" --region "$REGION" $PROFILE
fi

# Create application version
echo "Creating application version $VERSION_LABEL"
aws elasticbeanstalk create-application-version --application-name "$APP_NAME" --version-label "$VERSION_LABEL" --source-bundle S3Bucket=$BUCKET_NAME,S3Key=$ZIP_FILE --region "$REGION" $PROFILE

# Check environment exists and status
ENV_EXISTS=$(aws elasticbeanstalk describe-environments --application-name "$APP_NAME" --environment-names "$ENV_NAME" --region "$REGION" $PROFILE --query 'Environments[0].EnvironmentName' --output text || true)
ENV_STATUS=$(aws elasticbeanstalk describe-environments --application-name "$APP_NAME" --environment-names "$ENV_NAME" --region "$REGION" $PROFILE --query 'Environments[0].Status' --output text || true)

if [ "$ENV_EXISTS" = "None" ] || [ -z "$ENV_EXISTS" ] || [ "$ENV_STATUS" = "Terminated" ]; then
  echo "Creating environment $ENV_NAME"
  aws elasticbeanstalk create-environment --application-name "$APP_NAME" --environment-name "$ENV_NAME" --version-label "$VERSION_LABEL" --solution-stack-name "$SOLUTION_STACK_NAME" --option-settings Namespace=aws:elasticbeanstalk:application:environment,OptionName=NODE_ENV,Value=production Namespace=aws:elasticbeanstalk:application:environment,OptionName=PORT,Value=8080 Namespace=aws:autoscaling:launchconfiguration,OptionName=IamInstanceProfile,Value=$INSTANCE_PROFILE --region "$REGION" $PROFILE
  echo "Environment creation started."
else
  echo "Updating environment $ENV_NAME"
  aws elasticbeanstalk update-environment --environment-name "$ENV_NAME" --version-label "$VERSION_LABEL" --region "$REGION" $PROFILE
  echo "Environment update started."
fi

echo "Done. Use 'aws elasticbeanstalk describe-environments --application-name $APP_NAME --environment-names $ENV_NAME --region $REGION' to watch status."