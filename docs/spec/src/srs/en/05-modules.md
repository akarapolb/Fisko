# Modules overview {#modules}

Fisko is one application of six modules (ADR-0002). This chapter shows how they relate. It states no module requirement. Those are in the module chapters.

## How the modules relate {#mod-relate}

Money follows one path. Budget creates allocation lines. Procurement reserves and commits against a line, and passes accepted work to Finance. Finance pays and reconciles with GFMIS. Projects joins these records under one project id, using the allocation line as the shared key, and keeps no second copy. Review and analytics reads from all of them. Platform serves every module.

## What each module owns and needs {#mod-owns}

| Module | Owns | Needs from others |
| --- | --- | --- |
| Platform (`platform`) | Tenants, identity links, roles, separation-of-duties rules, delegation, audit log, notifications, working calendar, PDPA tools, files, documents, search interface, AI gateway | Nothing from other modules |
| Budget (`budget`) | Strategy links, budget requests, allocation lines and their amounts, transfers, the ledger of reserved and committed amounts on a line | Platform services |
| Procurement (`procurement`) | Plans, requisitions, case files, method rules, contracts, phases, acceptance, penalties, guarantees, the supplier register | Platform services. From Budget: allocation lines, room, reserve and commit. From Finance: facts through an SPI that Finance implements |
| Finance (`finance`) | Vouchers, payments, GFMIS records, reconciliation, closing | Platform services. From Budget: allocation lines and the ledger. From Procurement: accepted phases, the payment gate, contract and supplier data |
| Projects (`projects`) | The project id and links, the exchange with an agency project management system, the record of data shared outside | Platform services. Read-only data from Budget, Procurement and Finance |
| Review and analytics (`review`) | Agendas, scorecards, analytics views, AI assistance features | Platform services, including the AI gateway. Read-only data from every other module |

> [!NOTE] A module owns its tables, and no other module reads them. The chapter of a module is the place to find the rows behind each entry above.

## Dependency direction {#mod-direction}

Spring Modulith refuses dependency cycles, so the direction of each dependency is fixed.

- Every module depends on `platform`, and `platform` depends on none of them.
- `procurement` and `finance` depend on `budget`, and `budget` depends on neither.
- `finance` depends on `procurement.api` and implements an SPI that Procurement defines. Procurement reads Finance facts through that SPI, which avoids a cycle.
- `projects` and `review` depend on the published interfaces of the others. Only `review` depends on `projects`, and nothing depends on `review`.

Modules also publish events through the outbox (ADR-0008). An action that crosses modules, such as a contract creating a commitment, can run in one transaction, because the modules share one application (ADR-0002).

> [!OPEN] The Budget, Finance, Projects and Review chapters of the SDS confirm the directions above. The product owner must still confirm whether a future split of AI assistance out of `review` changes this list.
