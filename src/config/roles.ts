import type { Role } from '@/types';
import { NAV_ITEMS, type NavItem } from '@/components/layout/navConfig';

export interface RoleInfo {
  value: Role;
  label: string;
  /** One-line summary of the role's purpose. */
  summary: string;
  /** Key responsibilities / what this role is expected to do. */
  responsibilities: string[];
}

/**
 * Org-level roles shown in the Admin panel's role guide. Super Admin is a
 * platform role and is intentionally excluded here.
 *
 * Org Admin is listed first and has complete access to every module and role.
 */
export const ORG_ROLE_INFO: RoleInfo[] = [
  {
    value: 'org_admin',
    label: 'Organization Admin',
    summary: 'Complete access to all modules and roles — can run any function independently.',
    responsibilities: [
      'Full access to every operational, accounts and report screen',
      'Act on behalf of any role (Accountant, Sales, Inventory, Collection, Purchase, Auditor) during urgency',
      'Manage organization profile and branches',
      'Create users and assign roles',
      'Download organization data backups',
    ],
  },
  {
    value: 'accountant',
    label: 'Accountant',
    summary: 'Owns billing, settlements and the books of accounts.',
    responsibilities: [
      'Record sales and customer collections',
      'Generate customer bills and supplier settlements',
      'Manage expenses and rate/weight adjustments',
      'Review ledgers, cash/bank book and trial balance',
      'Run financial reports',
    ],
  },
  {
    value: 'sales_operator',
    label: 'Sales Operator',
    summary: 'Front-desk selling and customer billing.',
    responsibilities: [
      'Record sales (sale entry) and draw stock from lots',
      'Generate and print/share customer bills',
      'Manage customer master records',
      'Raise for-sale challans',
    ],
  },
  {
    value: 'inventory_manager',
    label: 'Inventory Manager',
    summary: 'Keeps stock, lots and crates accurate.',
    responsibilities: [
      'Maintain the item master',
      'Monitor stock lots and availability',
      'Track crate movement with parties',
      'Transfer stock via for-sale challans',
    ],
  },
  {
    value: 'collection_executive',
    label: 'Collection Executive',
    summary: 'Field collections (ugrahi) and receivables follow-up.',
    responsibilities: [
      'Record customer payment collections',
      'Track outstanding receivables and ageing',
    ],
  },
  {
    value: 'purchase_operator',
    label: 'Purchase Operator',
    summary: 'Inward goods and supplier management.',
    responsibilities: [
      'Record arrivals / purchases from suppliers',
      'Maintain the supplier master',
    ],
  },
  {
    value: 'auditor',
    label: 'Auditor',
    summary: 'Read-only oversight of accounts and reports.',
    responsibilities: [
      'Review accounting ledgers and trial balance',
      'View reports for verification',
    ],
  },
];

/**
 * Screens a role can reach, derived from the live nav config so the guide stays
 * in sync with the app. Org Admin reaches every org screen; others get their
 * assigned screens. Feature-gated screens are included (capability view),
 * regardless of the current plan.
 */
export function screensForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.platform && (role === 'org_admin' || item.roles.includes(role)),
  );
}
