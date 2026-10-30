# ADR-0010: File storage through the S3 API

Status: Accepted
Date: 2026-10-30

## Context

Fisko stores contracts, bids and evidence files. The hosted service and self-hosting agencies will use different storage. MinIO was the earlier choice, but it is now in maintenance mode.

## Decision

- Fisko uses only the **S3 API**, and is not tied to any product.
- The hosted service uses the cloud's managed object storage.
- Self-hosters use a compatible product. Ceph RGW is the documented enterprise option.
- Every upload is scanned with **ClamAV** before it can be downloaded.
- Files are encrypted under per-tenant keys (ADR-0013).

## Consequences

- Storage can change without code changes.
- Compatibility tests are needed for each documented storage product.

## Alternatives considered

- **MinIO:** rejected, as the community edition is no longer developed.
- **Database storage:** poor at this volume.
