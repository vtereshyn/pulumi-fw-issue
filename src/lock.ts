import { CustomResource } from "@pulumi/pulumi";
import { enums } from "@pulumi/azure-native/types/index.js";
import { ManagementLockByScope } from "@pulumi/azure-native/authorization/index.js";

export function lock<T extends CustomResource>(
  resource: T & { __name?: string; __protect?: boolean },
  level: enums.authorization.LockLevel = "CanNotDelete"
): T {
  new ManagementLockByScope(
    `${resource.__name!}-lock`,
    {
      level: level,
      scope: resource.id,
    },
    {
      parent: resource,
    }
  );

  resource.__protect = true;

  return resource;
}
