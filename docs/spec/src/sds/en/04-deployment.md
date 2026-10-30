# Deployment {#deployment}

> [!NOTE] This chapter designs the deployment decided in ADR-0012. Every recovery figure, schedule and retention period here is a proposal. ADR-0012 leaves recovery targets to the SRS, which proposes an RPO of 15 minutes and an RTO of 4 hours for a cell (XC-AVL-002, XC-AVL-003). The product owner must confirm them (OI-XC-02).

## Supported setups {#dep-setups}

Two setups share one codebase, and both are tested on each release (ADR-0012). The hosted service is the enterprise setup run by the operator on a Thai commercial cloud.

| Part | Hosted service | Enterprise self-host | Small self-host |
| --- | --- | --- | --- |
| Runs on | Managed Kubernetes, three zones | Kubernetes with high availability | Docker Compose |
| Database | Managed PostgreSQL | PostgreSQL cluster | Single PostgreSQL |
| Keys | Cloud KMS | OpenBao or HSM | OpenBao |
| Files | Cloud object storage | Ceph RGW | Any S3-compatible product |
| Messaging | RabbitMQ | RabbitMQ | Outbox only |
| Search | OpenSearch | OpenSearch | PostgreSQL search, with weaker Thai results |
| Cells | Many | One or more | One |
| Intended use | The service sold to agencies | A large agency, or GDCC | Trials and small agencies |

## Hosted service {#dep-hosted}

The hosted service runs on a Thai commercial cloud. AWS Thailand (`ap-southeast-7`, three Availability Zones) is the default, subject to the managed services needed being available there (ADR-0012).

{{fig:dep-hosted | Hosted service deployment}}

- Managed PostgreSQL, Kubernetes, object storage and KMS run across three zones.
- Each cell has its own Kubernetes cluster in this proposal, so that a cluster upgrade also touches one cell. The cost of that choice is recorded in DG-XC-13.
- Application code uses open interfaces only. Cloud-specific parts stay in OpenTofu modules and Helm values.
- All data, backups and logs stay in Thailand.
- Egress is blocked by default. Each adapter has a named list of destinations.

> [!OPEN] One vendor blog says agency cloud purchases must go through GDCC. If true, agencies may be unable to subscribe to a service on a commercial cloud. DGA or NT must confirm this (ADR-0012, DG-XC-11). The fallback is self-hosting on GDCC.

> [!OPEN] The cloud provider must confirm which managed services run in the chosen region (ADR-0012, DG-XC-12). Any gap is filled by running the open-source product in the cluster, which adds operating work.

## Small setup {#dep-small}

The small setup runs on one host with Docker Compose, for trials and small agencies (ADR-0012).

{{fig:dep-small | Small setup on Docker Compose}}

- The application runs the outbox relay itself, with no RabbitMQ (ADR-0008).
- PostgreSQL search replaces OpenSearch through the search interface (ADR-0009).
- OpenBao holds keys and also issues the certificates for mutual TLS between containers (proposal).
- A compose file, an environment template and a first-start script ship with each release.
- One host has no high availability, and an agency that picks this setup accepts that. Backups must leave the host.

## Environments {#dep-environments}

| Environment | Purpose | Data | Deployed |
| --- | --- | --- | --- |
| Local | Developer work, Testcontainers | Synthetic | By the developer |
| CI | Each pull request and each merge | Synthetic | By the pipeline |
| Test | Integration with stub adapters | Synthetic | On merge to the main branch |
| Staging | Release candidate on one small cell, both setups, load tests | Synthetic, at peak volume | On a release candidate |
| Production | The hosted service | Tenant data | One cell at a time |

Tenant data never leaves production, and it is not copied to lower environments. Sample agency data does not ship in any image. Test adapters exist only in test profiles (PRC-NFR-006). This environment list is a proposal.

## Cell provisioning {#dep-provisioning}

A new cell is created from code, with no manual step, so that tenant onboarding stays fully automated (ADR-0005).

1. An operator adds the cell to the inventory in the control plane, by a reviewed change in Git.
2. OpenTofu creates the cluster, database, storage, network and key grants.
3. Argo CD applies the Helm release of the current version to the cell.
4. The control plane runs smoke tests, then marks the cell open.

### Tenant onboarding {#dep-onboarding}

1. The control plane creates the tenant record and picks a cell.
2. It creates the Keycloak Organization and links the agency's identity provider.
3. It creates the tenant keysets, wrapped by the master key.
4. It adds the tenant to the routing map.
5. It loads starter settings within their allowed ranges, and templates as tenant data.
6. It runs a tenant smoke test and writes the first audit entry.

### Tenant move {#dep-move}

Moving a tenant between cells is a supported operation (ADR-0005).

1. Copy the tenant's rows and files to the target cell while the tenant works.
2. Put the tenant in maintenance, and wait until the outbox of the tenant is empty.
3. Copy the last changes, then verify row counts and the audit chain against the checkpoints.
4. Change the routing map, rebuild the search index, and open the tenant.
5. Keep the source rows for a set period, then delete them.

## Backup and restore {#dep-backup}

Backups stay in Thailand and are encrypted (ADR-0012, ADR-0013). Schedules and periods below are proposals.

| What | Method | Frequency | Keep for |
| --- | --- | --- | --- |
| PostgreSQL | Continuous archive with point-in-time recovery | Continuous, with a daily base backup | 35 days |
| PostgreSQL long-term | Monthly copy | Monthly | Follows the retention schedule (DG-XC-05) |
| Object storage | Versioning and a copy to a second location | Continuous | 35 days after deletion |
| Audit checkpoints | Write-once object storage | Each checkpoint | Follows the retention schedule |
| Keycloak and control plane databases | Same as PostgreSQL | Continuous | 35 days |
| Wrapped keysets | Inside the database backup | With the database | With the database |
| Master keys | Held by KMS, or OpenBao recovery shares for self-hosters | On change | Life of the data |
| Search indexes | Not backed up, rebuilt from PostgreSQL | Not applicable | Not applicable |

### Per-tenant export and restore {#dep-tenant-restore}

Per-tenant export and restore is built from the start, so that restoring one agency needs no whole-database rollback (ADR-0005).

{{fig:dep-tenant-restore | Per-tenant restore}}

- The tool is the same one that moves a tenant, so it runs often and stays correct.
- An export holds the tenant's rows, files and a signed manifest, encrypted under the tenant's key.
- After a restore, the erasure list is replayed before the tenant reopens (see the Audit log section of the Cross-cutting design chapter).
- A tenant's own export is also how an agency leaves the service.

### Rehearsal {#dep-rehearsal}

Recovery targets are rehearsed (ADR-0012). The proposal is a restore rehearsal at least every 90 days on staging, covering a whole cell and one tenant, and key recovery at least every 12 months. Each result is recorded with the measured times, and the system shows the date of the last restore test (XC-AVL-009, XC-SEC-031).

## Disaster recovery {#dep-dr}

The figures below are proposals for the product owner to confirm. RPO is the most data that may be lost. RTO is the longest time to return to service.

| Event | Response | RPO (proposal) | RTO (proposal) |
| --- | --- | --- | --- |
| One instance or node fails | Automatic restart | 0 | 5 minutes |
| One zone fails | Standby takes over, traffic moves, and service continues (XC-AVL-004) | 0 | 15 minutes |
| A cell fails, or its database is corrupted | Point-in-time recovery to a new cluster (XC-AVL-002, XC-AVL-003) | 15 minutes | 4 hours |
| One tenant's data is damaged | Per-tenant restore (XC-AVL-008) | 15 minutes | 8 hours |
| Global services fail | Redeploy from code, restore their databases | 15 minutes | 4 hours |
| The whole region is lost | Rebuild at a second site in Thailand from the off-site copy | 24 hours | 72 hours |

> [!OPEN] ADR-0012 requires all data to stay in Thailand, and this design assumes the chosen cloud has one region there. The second site must then be another provider, GDCC or a data centre inside Thailand. The product owner must decide the site and whether a region-loss target is promised to agencies, once the cloud provider has confirmed its regions (DG-XC-14).

## Rolling upgrades across cells {#dep-upgrades}

Schema changes follow expand and contract, so that old and new application versions work during a rolling upgrade (ADR-0005). Upgrades roll out cell by cell.

{{fig:dep-rollout | Rolling upgrade across cells}}

- Only the signed release is deployed, and Argo CD checks the signature first.
- A release must work with the schema of the previous release, and the previous release must work after the expand step. The compatibility window is one release.
- The contract step arrives in a later release, once all cells have passed the expand step.
- Rollback changes the application only. The schema stays expanded.
- Each tenant has one release at a time. Tenants of different cells may differ by one release during a rollout, so the API and events stay compatible across that window.
- A legal rule change uses dated rule versions, so that it takes effect on its date in every cell, and old cases keep their old rules (ADR-0007).
- No major release and no planned maintenance runs from 15 September to 5 October (XC-AVL-007, proposal). Planned maintenance is announced at least 5 working days ahead.

## Deployment plan {#dep-plan}

The plan orders the work and states what must be true before moving on. It holds no dates, because the product owner has set none.

| Phase | Work | Exit condition |
| --- | --- | --- |
| Confirm | GDCC question, regional services, licence audit, ThaID terms | Each fact in the ADR index is answered, or its fallback is chosen |
| Foundation | OpenTofu, Helm, Argo CD, CI pipeline, global services, one staging cell | A signed release reaches staging with no manual step |
| Pilot | One shared cell, first agencies | Restore rehearsal passed; objectives met for a full month |
| Scale | Cells to the tested density, load tests at the peak | k6 passes the 30 September peak; Keycloak passes at the 500-tenant target |
| Self-host | Small and enterprise packages, documentation | Both setups pass on the release; a third party installs from the documents |
| Operate | Rolling releases, restore rehearsals, a penetration test before each major release | Ongoing |

## Open issues {#dep-open}

| Issue | Question | Designed for now | Decides |
| --- | --- | --- | --- |
| DG-XC-11 | Must agency cloud purchases go through GDCC? | Hosted on a commercial cloud, with self-hosting on GDCC as the fallback | DGA or NT, product owner |
| DG-XC-12 | Which managed services run in the chosen region? | Managed services, replaced by open-source products where absent | Cloud provider, technical lead |
| DG-XC-13 | One Kubernetes cluster per cell costs more than namespaces. Is the isolation worth it? | One cluster per cell | Technical lead, product owner |
| DG-XC-14 | Where is the second site, and is a region-loss target promised? | An off-site copy in Thailand, with the proposed figures | Product owner |
| DG-XC-15 | Which recovery figures are promised, and in which contract? Carried from OI-XC-02 | The proposed table | Product owner |
