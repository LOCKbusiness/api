az webapp $1 --resource-group rg-lock-api-$2 --name app-lock-node-inp-$2 --slot stg
az webapp $1 --resource-group rg-lock-api-$2 --name app-lock-node-rew-$2 --slot stg

az webapp $1 --resource-group rg-lock-api-$2 --name app-lock-node-inp-$2
az webapp $1 --resource-group rg-lock-api-$2 --name app-lock-node-rew-$2