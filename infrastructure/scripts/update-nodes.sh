az webapp config container set --resource-group rg-lock-api-$1 --name app-lock-node-inp-$1 --multicontainer-config-type compose --multicontainer-config-file infrastructure/docker/defi-node-$1.yml --slot stg
az webapp config container set --resource-group rg-lock-api-$1 --name app-lock-node-rew-$1 --multicontainer-config-type compose --multicontainer-config-file infrastructure/docker/defi-node-$1.yml --slot stg
az webapp config container set --resource-group rg-lock-api-$1 --name app-lock-node-liq-$1 --multicontainer-config-type compose --multicontainer-config-file infrastructure/docker/defi-node-$1.yml --slot stg

az webapp config container set --resource-group rg-lock-api-$1 --name app-lock-node-inp-$1 --multicontainer-config-type compose --multicontainer-config-file infrastructure/docker/defi-node-$1.yml
az webapp config container set --resource-group rg-lock-api-$1 --name app-lock-node-rew-$1 --multicontainer-config-type compose --multicontainer-config-file infrastructure/docker/defi-node-$1.yml
az webapp config container set --resource-group rg-lock-api-$1 --name app-lock-node-liq-$1 --multicontainer-config-type compose --multicontainer-config-file infrastructure/docker/defi-node-$1.yml
