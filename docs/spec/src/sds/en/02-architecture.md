# Architecture {#architecture}

## Context view {#arch-context}

Fisko sits between agency users and suppliers on one side and government systems on the other.

{{fig:arch-context | Fisko system context}}

| External system | Purpose | Decision |
| --- | --- | --- |
| ThaID and agency directories | Sign-in | ADR-0006 |
| GFMIS | Government finance entries | ADR-0008 |
| e-GP | Government procurement data | ADR-0008 |
| AI provider | Optional assistance, off by default | ADR-0016 |

> [!OPEN] How GFMIS and e-GP connect is not confirmed. The Comptroller General's Department must supply the interface details.

## Other views {#arch-other}

> [!OPEN] The container, cell and request-path views are not written yet. They will follow the architecture diagrams in `docs/architecture/`.
