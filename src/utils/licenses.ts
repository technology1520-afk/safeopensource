export interface LicenseInfo {
  spdx: string;
  name: string;
  canCommercialUse: 'yes' | 'conditional' | 'network-clause' | 'warn';
  summary: string;
  obligations: string[];
  permissions: string[];
  limitations: string[];
}

const licenseRegistry: Record<string, LicenseInfo> = {
  'MIT': {
    spdx: 'MIT',
    name: 'MIT License',
    canCommercialUse: 'yes',
    summary: 'Extremely permissive. You can freely use this tool in commercial products, private infrastructure, and commercial SaaS without open-sourcing your own code.',
    obligations: ['Include original copyright notice and license disclaimer in copies or substantial portions.'],
    permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use', 'Sublicensing'],
    limitations: ['No warranty provided', 'No liability assumed by authors']
  },
  'Apache-2.0': {
    spdx: 'Apache-2.0',
    name: 'Apache License 2.0',
    canCommercialUse: 'yes',
    summary: 'Permissive with explicit patent protection. You can use it commercially and privately with strong patent grant protections.',
    obligations: ['Include copyright notice, copy of license, and state changes made to files.'],
    permissions: ['Commercial use', 'Modification', 'Distribution', 'Patent grant', 'Private use'],
    limitations: ['No trademark rights granted', 'No warranty provided']
  },
  'BSD-3-Clause': {
    spdx: 'BSD-3-Clause',
    name: 'BSD 3-Clause "New" or "Revised" License',
    canCommercialUse: 'yes',
    summary: 'Permissive license with a non-endorsement clause. You can use this commercially without releasing proprietary modifications.',
    obligations: ['Retain copyright notice and disclaimer', 'Cannot use author names to endorse derived products without permission.'],
    permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
    limitations: ['No warranty provided']
  },
  'GPL-3.0-only': {
    spdx: 'GPL-3.0-only',
    name: 'GNU General Public License v3.0',
    canCommercialUse: 'conditional',
    summary: 'Strong copyleft. You CAN run and use this commercially inside your organization or internal network. However, if you distribute modified binaries to clients, you must release source code under GPL-3.0.',
    obligations: ['Disclose source code if distributing binary deliverables', 'License derivative works under GPL-3.0', 'State changes made'],
    permissions: ['Commercial use internally', 'Modification', 'Private hosting'],
    limitations: ['Network distribution does not trigger copyleft, but physical binary distribution does']
  },
  'GPL-3.0-or-later': {
    spdx: 'GPL-3.0-or-later',
    name: 'GNU General Public License v3.0 or later',
    canCommercialUse: 'conditional',
    summary: 'Strong copyleft. Commercial internal hosting is 100% permitted. If you distribute compiled versions externally, you must provide full source code.',
    obligations: ['Disclose source code upon distribution', 'Retain copyright notice', 'Share alike'],
    permissions: ['Commercial use internally', 'Modification', 'Private execution'],
    limitations: ['Copyleft triggered upon external binary distribution']
  },
  'GPL-2.0-only': {
    spdx: 'GPL-2.0-only',
    name: 'GNU General Public License v2.0',
    canCommercialUse: 'conditional',
    summary: 'Classic copyleft. You can use this commercially on internal servers. Any external distribution of modified code requires sharing your source under GPL-2.0.',
    obligations: ['Provide source code with binary distributions', 'Document code modifications'],
    permissions: ['Commercial internal use', 'Modification'],
    limitations: ['Cannot link with incompatible copyleft licenses']
  },
  'LGPL-3.0-only': {
    spdx: 'LGPL-3.0-only',
    name: 'GNU Lesser General Public License v3.0',
    canCommercialUse: 'conditional',
    summary: 'Weak copyleft. You can link this library dynamically into commercial closed-source applications without open-sourcing your proprietary app code.',
    obligations: ['Modifications to the LGPL library itself must be open-sourced', 'Permit users to relink or reverse engineer the library'],
    permissions: ['Commercial use', 'Modification', 'Dynamic linking without viral contagion'],
    limitations: ['Changes to the library core must stay open']
  },
  'AGPL-3.0-only': {
    spdx: 'AGPL-3.0-only',
    name: 'GNU Affero General Public License v3.0',
    canCommercialUse: 'network-clause',
    summary: 'Network copyleft. You CAN use this for internal enterprise operations. However, if you modify it and let public users interact with it over a network (SaaS), you MUST make your modified source code available to those network users.',
    obligations: ['Provide source code to users interacting with the software over network/SaaS', 'Share modifications under AGPL-3.0'],
    permissions: ['Commercial internal use', 'Private deployment', 'Self-hosting for internal teams'],
    limitations: ['Network use clause triggers full source code disclosure requirement for modified SaaS versions']
  },
  'EUPL-1.2': {
    spdx: 'EUPL-1.2',
    name: 'European Union Public Licence v1.2',
    canCommercialUse: 'conditional',
    summary: 'Copyleft license recognized across EU member jurisdictions. Internal commercial deployment is free. Distribution or SaaS deployment with modifications requires source release.',
    obligations: ['Maintain copyright notices', 'Provide source code upon distribution'],
    permissions: ['Commercial use internally', 'Multi-lingual legal validity across 23 EU languages'],
    limitations: ['Compatible copyleft requirements on redistribution']
  },
  'BSL-1.1': {
    spdx: 'BSL-1.1',
    name: 'Business Source License 1.1',
    canCommercialUse: 'conditional',
    summary: 'Source-available license. You can use it free of charge for internal company production, testing, and development, provided you do not offer it as a competing commercial hosted database service.',
    obligations: ['Converts automatically to open source (Apache-2.0) after 4 years'],
    permissions: ['Free internal production self-hosting', 'Modification for internal use'],
    limitations: ['Cannot be resold as a managed commercial service']
  },
  'Sustainable-Use-License': {
    spdx: 'Sustainable-Use-License',
    name: 'Sustainable Use License / Fair-Code',
    canCommercialUse: 'conditional',
    summary: 'Fair-code model. Free for internal business automation and personal self-hosting. Commercial resale or hosting as a paid multi-tenant automation service requires an enterprise agreement.',
    obligations: ['Honor non-compete commercial hosting terms'],
    permissions: ['Internal organizational use', 'Source inspection', 'Modification for internal operations'],
    limitations: ['Cannot offer paid managed service competing directly with vendor']
  }
};

export function getLicenseInfo(spdx: string): LicenseInfo {
  if (licenseRegistry[spdx]) {
    return licenseRegistry[spdx];
  }

  // Fallback for unidentified or custom licenses
  return {
    spdx: spdx || 'Unknown',
    name: spdx || 'Custom / Unspecified License',
    canCommercialUse: 'warn',
    summary: 'Unrecognized or custom license terms. Review the repository license file carefully before commercial or production integration.',
    obligations: ['Inspect upstream LICENSE file on GitHub before commercial deployment.'],
    permissions: ['Permitted according to upstream repo terms'],
    limitations: ['Legal warranty and commercial rights are unspecified']
  };
}

