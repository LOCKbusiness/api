# Infrastructure Deployment

1. Update parameter files
1. Temp: Update JWT secret
1. Do deployment: `az deployment group create -g rg-lock-api-{env} -f infrastructure/bicep/lock-api.bicep -p infrastructure/bicep/parameters/{env}.json`
1. Loc: remove unused resources (API app service + plan, app insights)
1. Dev: remove unused resources (INT node), node url app configuration
