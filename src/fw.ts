import {
  AzureFirewall,
  FirewallPolicy,
  FirewallPolicyRuleCollectionGroup,
  PublicIPAddress,
  Subnet,
} from "@pulumi/azure-native/network/index.js";
import { lock } from "./lock.js";

import { vnet } from "./vnet.js";
import { fwPrivateIPAddress, resourceGroup, defaultTags } from "../config.js";

export const pip = lock(
  new PublicIPAddress(
    "fw-pip",
    {
      publicIpAddressName: "fw-pip",
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      publicIPAllocationMethod: "Static",
      sku: {
        name: "Standard",
      },
      tags: {
        ...defaultTags,
      },
    },
    {
      parent: resourceGroup,
    }
  )
);

export const pipK8s = lock(
  new PublicIPAddress(
    "fw-k8s-pip",
    {
      publicIpAddressName: "fw-app-k8s-pip",
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      publicIPAllocationMethod: "Static",
      sku: {
        name: "Standard",
      },
      tags: {
        ...defaultTags,
      },
    },
    {
      parent: resourceGroup,
    }
  )
);

export const pipAppK8sProd = lock(
  new PublicIPAddress(
    "fw-app-k8s-prod-pip",
    {
      publicIpAddressName: "fw-app-k8s-prod-pip",
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      publicIPAllocationMethod: "Static",
      sku: {
        name: "Standard",
      },
      tags: {
        ...defaultTags,
      },
    },
    {
      parent: resourceGroup,
      ignoreChanges: ["ipConfiguration", "etag"],
    }
  )
);

export const pipMainK8s = lock(
  new PublicIPAddress(
    "fw-main-k8s-pip",
    {
      publicIpAddressName: "fw-main-k8s-pip",
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      publicIPAllocationMethod: "Static",
      sku: {
        name: "Standard",
      },
      tags: {
        ...defaultTags,
      },
    },
    {
      parent: resourceGroup,
      ignoreChanges: ["ipConfiguration", "etag"],
    }
  )
);

export const pips = [pip, pipK8s, pipMainK8s, pipAppK8sProd];

export const subnet = lock(
  new Subnet(
    "fw-subnet",
    {
      subnetName: "AzureFirewallSubnet",
      addressPrefix: "0.0.0.0/24",
      resourceGroupName: resourceGroup.name,
      virtualNetworkName: vnet.name,
    },
    { parent: vnet, ignoreChanges: ["serviceEndpoints"] }
  )
);

export const fwPolicy = new FirewallPolicy(
  "fw-policy",
  {
    dnsSettings: {
      enableProxy: true,
    },
    firewallPolicyName: "fw-policy",
    intrusionDetection: {
      mode: "Deny",
    },
    threatIntelMode: "Deny",
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name,
    sku: {
      tier: "Premium",
    },
    tags: {
      ...defaultTags,
    },
  },
  { parent: resourceGroup }
);

export const fw = lock(
  new AzureFirewall(
    "fw",
    {
      azureFirewallName: "fw",
      firewallPolicy: {
        id: fwPolicy.id,
      },
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      hubIPAddresses: {
        privateIPAddress: fwPrivateIPAddress,
      },
      sku: {
        name: "AZFW_VNet",
        tier: "Premium",
      },
      ipConfigurations: [
        {
          name: pip.name,
          subnet: {
            id: subnet.id,
          },
          publicIPAddress: {
            id: pip.id,
          },
        },
        ...[pipK8s, pipMainK8s, pipAppK8sProd].map((publicIp) => ({
          name: publicIp.name,
          publicIPAddress: {
            id: publicIp.id,
          },
        })),
      ],
      tags: {
        ...defaultTags,
      },
    },
    {
      parent: fwPolicy,
      ignoreChanges: ["ipConfiguration", "etag"],
    }
  )
);

const networkRCG = new FirewallPolicyRuleCollectionGroup(
  "networkRCG",
  {
    firewallPolicyName: fwPolicy.name,
    priority: 200,
    resourceGroupName: resourceGroup.name,
    ruleCollectionGroupName: "networkRCG",
    ruleCollections: [
      {
        action: {
          type: "Deny",
        },
        name: "deny-rules",
        priority: 100,
        ruleCollectionType: "FirewallPolicyFilterRuleCollection",
        rules: [
          {
            destinationAddresses: ["*"],
            destinationPorts: ["*"],
            ipProtocols: ["ICMP", "Any", "UDP", "TCP"],
            name: "web-attacs",
            ruleType: "NetworkRule",
            sourceAddresses: ["23.148.145.235", "178.128.235.57"],
          },
          {
            destinationAddresses: ["*"],
            destinationPorts: ["*"],
            ipProtocols: ["ICMP", "Any", "UDP", "TCP"],
            name: "port-scan",
            ruleType: "NetworkRule",
            sourceAddresses: [],
          },
          {
            destinationAddresses: ["*"],
            destinationPorts: ["*"],
            ipProtocols: ["ICMP", "Any", "UDP", "TCP"],
            name: "brute-force",
            ruleType: "NetworkRule",
            sourceAddresses: [],
          },
          {
            destinationAddresses: ["*"],
            destinationPorts: ["*"],
            ipProtocols: ["ICMP", "Any", "UDP", "TCP"],
            name: "bad-actors",
            ruleType: "NetworkRule",
            sourceAddresses: ["218.92.0.209", "46.8.27.134", "102.185.86.237"],
          },
          {
            destinationAddresses: ["*"],
            destinationPorts: ["1270", "3389", "5985", "5986"],
            ipProtocols: ["ICMP", "Any", "UDP", "TCP"],
            name: "CVE-2021-38647",
            ruleType: "NetworkRule",
            sourceAddresses: ["*"],
          },
        ],
      },
      {
        action: {
          type: "Allow",
        },
        name: "aks-egress",
        priority: 101,
        ruleCollectionType: "FirewallPolicyFilterRuleCollection",
        rules: [
          {
            destinationAddresses: ["*"],
            destinationPorts: ["445", "443"],
            ipProtocols: ["TCP"],
            name: "files",
            ruleType: "NetworkRule",
            sourceAddresses: ["*"],
          },
          {
            destinationAddresses: ["AzureCloud.WestUS2"],
            destinationPorts: ["9000", "1194"],
            ipProtocols: ["UDP", "TCP"],
            name: "control-plane",
            ruleType: "NetworkRule",
            sourceAddresses: ["*"],
          },
          {
            destinationAddresses: ["*"],
            destinationPorts: ["53"],
            ipProtocols: ["UDP"],
            name: "DNS",
            ruleType: "NetworkRule",
            sourceAddresses: ["*"],
          },
          {
            destinationAddresses: ["*"],
            destinationPorts: ["123"],
            ipProtocols: ["UDP"],
            name: "NTP",
            ruleType: "NetworkRule",
            sourceAddresses: ["*"],
          },
          {
            destinationAddresses: [
              "AzureActiveDirectory",
              "MicrosoftContainerRegistry",
              "AzureContainerRegistry",
              "AzureMonitor",
            ],
            destinationPorts: ["*"],
            ipProtocols: ["TCP"],
            name: "services",
            ruleType: "NetworkRule",
            sourceAddresses: ["*"],
          },
        ],
      },
    ],
  },
  { parent: fw }
);

new FirewallPolicyRuleCollectionGroup(
  "appRCG",
  {
    firewallPolicyName: fwPolicy.name,
    priority: 300,
    resourceGroupName: resourceGroup.name,
    ruleCollectionGroupName: "appRCG",
    ruleCollections: [
      {
        action: {
          type: "Allow",
        },
        name: "aks",
        priority: 100,
        ruleCollectionType: "FirewallPolicyFilterRuleCollection",
        rules: [
          {
            name: "aks-api",
            protocols: [
              {
                port: 443,
                protocolType: "Https",
              },
            ],
            ruleType: "ApplicationRule",
            sourceAddresses: ["*"],
            targetFqdns: ["management.azure.com"],
          },
          {
            name: "nodes",
            protocols: [
              {
                port: 443,
                protocolType: "Https",
              },
            ],
            ruleType: "ApplicationRule",
            sourceAddresses: ["*"],
            targetFqdns: ["*.hcp.westus2.azmk8s.io"],
            terminateTLS: false,
          },
          {
            name: "aad",
            protocols: [
              {
                port: 443,
                protocolType: "Https",
              },
            ],
            ruleType: "ApplicationRule",
            sourceAddresses: ["*"],
            targetFqdns: ["login.microsoftonline.com"],
          },
          {
            fqdnTags: ["AzureKubernetesService"],
            name: "allow-kubernetes-fqdn",
            protocols: [
              {
                port: 443,
                protocolType: "Https",
              },
            ],
            ruleType: "ApplicationRule",
            sourceAddresses: ["*"],
          },
          {
            name: "cni",
            protocols: [
              {
                port: 443,
                protocolType: "Https",
              },
            ],
            ruleType: "ApplicationRule",
            sourceAddresses: ["*"],
            targetFqdns: ["acs-mirror.azureedge.net"],
          },
        ],
      },
      {
        action: {
          type: "Allow",
        },
        name: "container-registry",
        priority: 101,
        ruleCollectionType: "FirewallPolicyFilterRuleCollection",
        rules: [
          {
            name: "allow-containerregistry",
            protocols: [
              {
                port: 443,
                protocolType: "Https",
              },
            ],
            ruleType: "ApplicationRule",
            sourceAddresses: ["*"],
            targetFqdns: ["*.azurecr.io"],
          },
          {
            name: "allow-network",
            protocols: [
              {
                port: 80,
                protocolType: "Http",
              },
              {
                port: 443,
                protocolType: "Https",
              },
            ],
            ruleType: "ApplicationRule",
            sourceAddresses: ["*"],
            targetFqdns: ["*.docker.com", "mcr.microsoft.com"],
          },
        ],
      },
      {
        action: {
          type: "Allow",
        },
        name: "security-updates",
        priority: 102,
        ruleCollectionType: "FirewallPolicyFilterRuleCollection",
        rules: [
          {
            name: "allow-updates",
            protocols: [
              {
                port: 80,
                protocolType: "Http",
              },
              {
                port: 443,
                protocolType: "Https",
              },
            ],
            ruleType: "ApplicationRule",
            sourceAddresses: ["*"],
            targetFqdns: [
              "*.update.microsoft.com",
              "download.windowsupdate.com",
            ],
          },
        ],
      },
    ],
  },
  { parent: networkRCG }
);
