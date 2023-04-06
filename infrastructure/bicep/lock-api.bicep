// --- PARAMETERS --- //
param location string
param env string
param network string
param oceanUrls string

param dbAllowAllIps bool
param dbAdminLogin string
@secure()
param dbAdminPassword string
param dbTier string
param dbCapacity int

param mailUser string
@secure()
param mailPass string

@secure()
param jwtSecret string = newGuid()

param nodeAllowAllIps bool
@secure()
param nodePassword string
@secure()
param nodeWalletPassword string
param rewStakingAddress string

param nodeServicePlanSkuName string
param nodeServicePlanSkuTier string
param hasBackupNodes bool

param myDeFiChainUser string
@secure()
param myDeFiChainPassword string

@secure()
param kycSecret string
@secure()
param kycWebhookIps string
@secure()
param kycPhrase string
param kycApiUrl string
param kycFrontendUrl string

param apiSignAddress string
param liquidityAddress string
param liquidityWalletName string
param liquidityAccountIndex string

param yieldMachineLiquidityAddress string
param yieldMachineLiquidityWalletName string
param yieldMachineLiquidityAccountIndex string
param yieldMachineRewardAddress string

@secure()
param forwardPhrase string

param kycWalletId string

param azureSubscriptionId string
param azureTenantId string
param azureClientId string
@secure()
param azureClientSecret string

// --- VARIABLES --- //
var compName = 'lock'
var apiName = 'api'
var nodeName = 'node'

var virtualNetName = 'vnet-${compName}-${apiName}-${env}'
var subNetName = 'snet-${compName}-${apiName}-${env}'

var storageAccountName = replace('st-${compName}-${apiName}-${env}', '-', '')
var dbBackupContainerName = 'db-bak'

var sqlServerName = 'sql-${compName}-${apiName}-${env}'
var sqlDbName = 'sqldb-${compName}-${apiName}-${env}'

var apiServicePlanName = 'plan-${compName}-${apiName}-${env}'
var apiAppName = 'app-${compName}-${apiName}-${env}'
var appInsightsName = 'appi-${compName}-${apiName}-${env}'

var nodeProps = [
  {
    name: 'nodes-input-${env}'
    servicePlanName: 'plan-${compName}-${nodeName}-inp-${env}'
    appName: 'app-${compName}-${nodeName}-inp-${env}'
    fileShareNameA: 'node-inp-data-a'
    fileShareNameB: 'node-inp-data-b'
  }
  {
    name: 'nodes-reward-${env}'
    servicePlanName: 'plan-${compName}-${nodeName}-rew-${env}'
    appName: 'app-${compName}-${nodeName}-rew-${env}'
    fileShareNameA: 'node-rew-data-a'
    fileShareNameB: 'node-rew-data-b'
  }
]

// --- RESOURCES --- //

// Virtual Network
resource virtualNet 'Microsoft.Network/virtualNetworks@2020-11-01' = {
  name: virtualNetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.0.0.0/16'
      ]
    }
    subnets: [
      {
        name: subNetName
        properties: {
          addressPrefix: '10.0.0.0/24'
          serviceEndpoints: [
            {
              service: 'Microsoft.Web'
              locations: [
                '*'
              ]
            }
            {
              service: 'Microsoft.Sql'
              locations: [
                '*'
              ]
            }
          ]
          delegations: [
            {
              name: '0'
              properties: {
                serviceName: 'Microsoft.Web/serverFarms'
              }
            }
          ]
          privateEndpointNetworkPolicies: 'Enabled'
          privateLinkServiceNetworkPolicies: 'Enabled'
        }
      }
    ]
  }
}

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2021-04-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
  }
}

resource dbBackupContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2021-04-01' = {
  name: '${storageAccount.name}/default/${dbBackupContainerName}'
}

// SQL Database
resource sqlServer 'Microsoft.Sql/servers@2021-02-01-preview' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: dbAdminLogin
    administratorLoginPassword: dbAdminPassword
  }
}

resource sqlVNetRule 'Microsoft.Sql/servers/virtualNetworkRules@2021-02-01-preview' = {
  parent: sqlServer
  name: 'apiVNetRule'
  properties: {
    virtualNetworkSubnetId: virtualNet.properties.subnets[0].id
  }
}

resource sqlAllRule 'Microsoft.Sql/servers/firewallRules@2021-02-01-preview' = if (dbAllowAllIps) {
  parent: sqlServer
  name: 'all'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '255.255.255.255'
  }
}

resource sqlDb 'Microsoft.Sql/servers/databases@2021-02-01-preview' = {
  parent: sqlServer
  name: sqlDbName
  location: location
  sku: {
    name: dbTier
    tier: dbTier
    capacity: dbCapacity
  }
}

resource sqlDbStrPolicy 'Microsoft.Sql/servers/databases/backupShortTermRetentionPolicies@2021-08-01-preview' = {
  parent: sqlDb
  name: 'default'
  properties: {
    retentionDays: dbTier == 'Basic' ? 7 : 35
    diffBackupIntervalInHours: 24
  }
}

resource sqlDbLtrPolicy 'Microsoft.Sql/servers/databases/backupLongTermRetentionPolicies@2021-08-01-preview' = {
  parent: sqlDb
  name: 'default'
  properties: {
    weeklyRetention: 'P5W'
    monthlyRetention: 'P12M'
    yearlyRetention: 'P10Y'
    weekOfYear: 1
  }
}

// API App Service
resource appServicePlan 'Microsoft.Web/serverfarms@2018-02-01' = if (env != 'loc') {
  name: apiServicePlanName
  location: location
  kind: 'linux'
  properties: {
    reserved: true
  }
  sku: {
    name: 'P1v2'
    tier: 'PremiumV2'
    capacity: 1
  }
}

resource apiAppService 'Microsoft.Web/sites@2018-11-01' = if (env != 'loc') {
  name: apiAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    virtualNetworkSubnetId: virtualNet.properties.subnets[0].id

    siteConfig: {
      alwaysOn: true
      linuxFxVersion: 'NODE|16-lts'
      appCommandLine: 'npm run start:prod'
      httpLoggingEnabled: true
      logsDirectorySizeLimit: 100
      vnetRouteAllEnabled: true
      scmIpSecurityRestrictionsUseMain: true

      appSettings: [
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: env != 'loc' ? appInsights.properties.InstrumentationKey : ''
        }
        {
          name: 'ENVIRONMENT'
          value: env
        }
        {
          name: 'NETWORK'
          value: network
        }
        {
          name: 'OCEAN_URLS'
          value: oceanUrls
        }
        {
          name: 'SQL_HOST'
          value: sqlServer.properties.fullyQualifiedDomainName
        }
        {
          name: 'SQL_PORT'
          value: '1433'
        }
        {
          name: 'SQL_USERNAME'
          value: dbAdminLogin
        }
        {
          name: 'SQL_PASSWORD'
          value: dbAdminPassword
        }
        {
          name: 'SQL_DB'
          value: sqlDbName
        }
        {
          name: 'JWT_SECRET'
          value: jwtSecret
        }
        {
          name: 'SQL_SYNCHRONIZE'
          value: 'false'
        }
        {
          name: 'SQL_MIGRATE'
          value: 'true'
        }
        {
          name: 'MAIL_USER'
          value: mailUser
        }
        {
          name: 'MAIL_PASS'
          value: mailPass
        }
        {
          name: 'NODE_USER'
          value: 'lock-api'
        }
        {
          name: 'NODE_PASSWORD'
          value: nodePassword
        }
        {
          name: 'NODE_WALLET_PASSWORD'
          value: nodeWalletPassword
        }
        {
          name: 'REW_STAKING_ADDRESS'
          value: rewStakingAddress
        }
        {
          name: 'NODE_INP_URL_ACTIVE'
          value: nodes[0].outputs.url
        }
        {
          name: 'NODE_INP_URL_PASSIVE'
          value: nodes[0].outputs.urlStg
        }
        {
          name: 'NODE_REW_URL_ACTIVE'
          value: nodes[1].outputs.url
        }
        {
          name: 'NODE_REW_URL_PASSIVE'
          value: nodes[1].outputs.urlStg
        }
        {
          name: 'MYDEFICHAIN_USER'
          value: myDeFiChainUser
        }
        {
          name: 'MYDEFICHAIN_PASSWORD'
          value: myDeFiChainPassword
        }
        {
          name: 'KYC_SECRET'
          value: kycSecret
        }
        {
          name: 'KYC_WEBHOOK_IPS'
          value: kycWebhookIps
        }
        {
          name: 'KYC_PHRASE'
          value: kycPhrase
        }
        {
          name: 'KYC_API_URL'
          value: kycApiUrl
        }
        {
          name: 'KYC_FRONTEND_URL'
          value: kycFrontendUrl
        }
        {
          name: 'API_SIGN_ADDRESS'
          value: apiSignAddress
        }
        {
          name: 'LIQUIDITY_ADDRESS'
          value: liquidityAddress
        }
        {
          name: 'LIQUIDITY_WALLET_NAME'
          value: liquidityWalletName
        }
        {
          name: 'LIQUIDITY_ACCOUNT_INDEX'
          value: liquidityAccountIndex
        }
        {
          name: 'YIELD_MACHINE_LIQUIDITY_ADDRESS'
          value: yieldMachineLiquidityAddress
        }
        {
          name: 'YIELD_MACHINE_LIQUIDITY_WALLET_NAME'
          value: yieldMachineLiquidityWalletName
        }
        {
          name: 'YIELD_MACHINE_LIQUIDITY_ACCOUNT_INDEX'
          value: yieldMachineLiquidityAccountIndex
        }
        {
          name: 'YIELD_MACHINE_REWARD_ADDRESS'
          value: yieldMachineRewardAddress
        }
        {
          name: 'FORWARD_PHRASE'
          value: forwardPhrase
        }
        {
          name: 'KYC_WALLET_ID'
          value: kycWalletId
        }
        {
          name: 'AZURE_SUBSCRIPTION_ID'
          value: azureSubscriptionId
        }
        {
          name: 'AZURE_TENANT_ID'
          value: azureTenantId
        }
        {
          name: 'AZURE_CLIENT_ID'
          value: azureClientId
        }
        {
          name: 'AZURE_CLIENT_SECRET'
          value: azureClientSecret
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
    }
  }
}

resource appInsights 'microsoft.insights/components@2020-02-02-preview' = if (env != 'loc') {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    IngestionMode: 'ApplicationInsights'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// DeFi Nodes
module nodes 'defi-node.bicep' = [for node in nodeProps: {
  name: node.name
  params: {
    location: location
    servicePlanName: node.servicePlanName
    servicePlanSkuName: nodeServicePlanSkuName
    servicePlanSkuTier: nodeServicePlanSkuTier
    appName: node.appName
    subnetId: virtualNet.properties.subnets[0].id
    storageAccountName: storageAccountName
    storageAccountId: storageAccount.id
    fileShareNameA: node.fileShareNameA
    fileShareNameB: node.fileShareNameB
    allowAllIps: nodeAllowAllIps
    hasBackup: hasBackupNodes
  }
}]
