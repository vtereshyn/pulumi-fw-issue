import * as pulumi from "@pulumi/pulumi";

import * as config from "./config.js";
import * as fw from "./src/fw.js";

export const resourceGroup = {
  name: config.resourceGroup.name,
  location: config.resourceGroup.location,
  id: config.resourceGroup.id,
};

export const firewall = {
  ip: config.fwPrivateIPAddress,
  name: fw.fw.name,
  pips: fw.pips.map((pip) =>
    pulumi.all([pip.ipAddress, pip.name]).apply(([ipAddress, name]) => ({
      ipAddress,
      name,
    }))
  ),
  policyId: fw.fwPolicy.id,
  policyName: fw.fwPolicy.name,
};
