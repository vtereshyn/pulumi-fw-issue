import { VirtualNetwork } from '@pulumi/azure-native/network/index.js';

import { fwPrivateIPAddress, resourceGroup } from '../config.js';

export const vnet = new VirtualNetwork(
  'hub-vnet',
  {
    virtualNetworkName: 'hub-vnet',
    addressSpace: {
      addressPrefixes: ['0.0.0.0/22']
    },
    dhcpOptions: {
      dnsServers: [fwPrivateIPAddress]
    },
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name
  },
  {
    parent: resourceGroup,
    ignoreChanges: ['subnets', 'virtualNetworkPeerings']
  }
);
