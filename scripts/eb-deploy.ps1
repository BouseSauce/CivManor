param(
    [string]$BucketName = "elasticbeanstalk-ap-southeast-2-805530280791",
    [string]$AppName = "Sovereign",
    [string]$EnvName = "Sovereign-env",
    [string]$Region = "ap-southeast-2",
    [string]$Profile = $null,
    [string]$VersionLabel = "v$(Get-Date -Format yyyyMMddHHmmss)",
    [string]$SolutionStackName = "64bit Amazon Linux 2 v5.15.7 running Node.js 18",
    [string]$PlatformArn = "arn:aws:elasticbeanstalk:ap-southeast-2::platform/Node.js 24 running on 64bit Amazon Linux 2023/6.7.1",
    [string]$InstanceProfile = "aws-elasticbeanstalk-ec2-role2",
    [switch]$ForceCreate
)

$awsProfileArg = ""
if ($Profile) { $awsProfileArg = "--profile $Profile" }

# Step 0: Build & package (uses existing deploy-eb.ps1 which prepares deploy.zip)
Write-Host "Building and packaging application (deploy.zip)..."
& pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-eb.ps1
if ($LASTEXITCODE -ne 0) { Write-Error "Packaging failed."; exit 1 }

$ZipFile = "deploy.zip"
if (!(Test-Path $ZipFile)) { Write-Error "$ZipFile not found. Aborting."; exit 1 }

# Step 1: Upload to S3
Write-Host "Uploading $ZipFile to s3://$BucketName/$ZipFile ..."
$uploadCmd = "aws s3 cp $ZipFile s3://$BucketName/$ZipFile --region $Region $awsProfileArg"
Invoke-Expression $uploadCmd
if ($LASTEXITCODE -ne 0) { Write-Error "S3 upload failed."; exit 1 }

# Step 2: Ensure application exists and create application version
Write-Host "Ensuring Elastic Beanstalk application '$AppName' exists..."
$describeAppArgs = @(
    "elasticbeanstalk",
    "describe-applications",
    "--application-names", $AppName,
    "--region", $Region
)
if ($Profile) { $describeAppArgs += @("--profile", $Profile) }
$appDesc = & aws @describeAppArgs 2>$null | Out-String
if (-not $appDesc -or $appDesc.Trim() -eq "") {
    Write-Host "Application '$AppName' not found; creating it..."
    $createAppArgs = @(
        "elasticbeanstalk",
        "create-application",
        "--application-name", $AppName,
        "--region", $Region
    )
    if ($Profile) { $createAppArgs += @("--profile", $Profile) }
    & aws @createAppArgs
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to create application '$AppName'."; exit 1 }
    Write-Host "Application created."
}

Write-Host "Creating application version $VersionLabel for $AppName..."
$createVerArgs = @(
    "elasticbeanstalk",
    "create-application-version",
    "--application-name", $AppName,
    "--version-label", $VersionLabel,
    "--source-bundle", "S3Bucket=$BucketName,S3Key=$ZipFile",
    "--region", $Region
)
if ($Profile) { $createVerArgs += @("--profile", $Profile) }
& aws @createVerArgs
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to create application version."; exit 1 }

# Step 3: Check if environment exists
Write-Host "Checking for existing environment $EnvName..."
$describeCmd = "aws elasticbeanstalk describe-environments --application-name $AppName --environment-names $EnvName --region $Region --query 'Environments[0].EnvironmentName' --output text $awsProfileArg"
$existing = Invoke-Expression $describeCmd | Out-String
$existing = $existing.Trim()

$statusCmd = "aws elasticbeanstalk describe-environments --application-name $AppName --environment-names $EnvName --region $Region --query 'Environments[0].Status' --output text $awsProfileArg"
$envStatus = Invoke-Expression $statusCmd | Out-String
$envStatus = $envStatus.Trim()

if ($existing -eq 'None' -or -not $existing -or $envStatus -eq 'Terminated' -or $ForceCreate.IsPresent) {
    Write-Host "Environment not found or creating new environment. Creating environment $EnvName..."
    $createEnvArgs = @(
        "elasticbeanstalk",
        "create-environment",
        "--application-name", $AppName,
        "--environment-name", $EnvName,
        "--version-label", $VersionLabel
    )
    # Prefer explicit Platform ARN when available, else use solution stack name
    if ($PlatformArn) { $createEnvArgs += @("--platform-arn", $PlatformArn) } else { $createEnvArgs += @("--solution-stack-name", $SolutionStackName) }
    $createEnvArgs += @(
        "--option-settings",
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=NODE_ENV,Value=production",
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=PORT,Value=8080",
            "Namespace=aws:autoscaling:launchconfiguration,OptionName=IamInstanceProfile,Value=$InstanceProfile",
        "--region", $Region
    )
    if ($Profile) { $createEnvArgs += @("--profile", $Profile) }
    & aws @createEnvArgs
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to create environment."; exit 1 }
    Write-Host "Environment creation started. It may take several minutes.";
} else {
    Write-Host "Environment exists. Updating environment $EnvName to version $VersionLabel..."
    $updateCmd = "aws elasticbeanstalk update-environment --environment-name $EnvName --version-label $VersionLabel --region $Region $awsProfileArg"
    Invoke-Expression $updateCmd
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to update environment."; exit 1 }
    Write-Host "Environment update started.";
}

Write-Host "Done. Use 'aws elasticbeanstalk describe-environments --application-name $AppName --environment-names $EnvName --region $Region' to watch status."