import * as pulumi from "@pulumi/pulumi";
import { ResourceGroup } from "@pulumi/azure-native/resources/index.js";

const config = new pulumi.Config();

const location = config.get("location") || "westus2";

export const defaultTags = {
  stack: "fw-test",
  project: "pulumi-fw-test",
};

export const resourceGroup = new ResourceGroup("resource-group", {
  resourceGroupName: `fw-test-rg`,
  location,
  tags: {
    ...defaultTags,
  },
});

export const fwPrivateIPAddress = "0.0.0.0";
