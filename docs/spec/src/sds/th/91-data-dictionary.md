# พจนานุกรมข้อมูล {#data-dictionary}

> [!NOTE] เนื้อหาทั้งบทเป็นข้อเสนอ บทนี้รวบรวมหัวข้อการออกแบบข้อมูลของแต่ละบทโมดูล และไม่เพิ่มตารางใหม่ บทโมดูลยังเป็นแหล่งข้อมูลหลัก การเปลี่ยนแปลงต้องทำที่บทโมดูลก่อน

## วิธีอ่านบทนี้ {#dd-read}

- แต่ละ schema เป็นของโมดูลเดียว และโมดูลอื่นไม่อ่าน schema นั้น (ADR-0002, ADR-0005)
- แถวหนึ่งอาจมีหลายตารางที่เกี่ยวข้องกัน เครื่องหมายอัฒภาคในคอลัมน์หลักแยกแต่ละตารางตามลำดับที่ระบุ
- คอลัมน์หลักคือคอลัมน์ที่สำคัญต่อการออกแบบ และไม่ใช่รายการคอลัมน์ทั้งหมด
- ชั้นข้อมูลคือชั้นตาม ADR-0013 ของทั้งแถว ส่วนตารางฟิลด์แสดงข้อยกเว้น
- รหัสการเก็บรักษาอ้างถึงแถวหนึ่งในตารางของ ADR-0014 และไม่ระบุระยะเวลา เพราะระยะเวลายังเป็นประเด็นเปิด

[กฎสำหรับทุกตาราง](#prc-data-rules)ในบทจัดซื้อจัดจ้างใช้กับทุก schema ได้แก่ `tenant_id` เป็นคอลัมน์แรกในทุกคีย์ บังคับ row-level security คอลัมน์ร่วม `tenant_id`, `id`, `created_at`, `created_by_ref`, `updated_at` และ `version` ที่ aggregate root เลขทางธุรกิจแยกคอลัมน์ เงินเป็น `numeric` และ migration แบบ expand and contract ตารางด้านล่างไม่แสดงคอลัมน์ร่วมเหล่านี้

> [!OPEN] บทโมดูลมอบเรื่องชนิดคอลัมน์ ดัชนี และข้อจำกัดให้บทนี้ แต่ยังไม่ได้ออกแบบ หัวหน้าทีมเทคนิคต้องเพิ่มเมื่อเริ่มสร้างระบบ และ scale ของเงินขึ้นกับ DG-PRC-02 และ DG-BGT-02 เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลต้องยืนยันฐานทางกฎหมายของฟิลด์ส่วนบุคคลแต่ละรายการ

## Schema {#dd-schemas}

| Schema | โมดูล | แถวตาราง | จำนวนตาราง | แถวที่มีข้อมูล Restricted | ที่มา |
| --- | --- | --- | --- | --- | --- |
| `platform` | แพลตฟอร์ม | 32 | 43 | 1 | [แพลตฟอร์ม](#plt-data) |
| `budget` | งบประมาณ | 30 | 81 | 0 | [งบประมาณ](#bgt-data) |
| `procurement` | จัดซื้อจัดจ้าง | 41 | 73 | 1 | [จัดซื้อจัดจ้าง](#prc-data) |
| `finance` | การเงิน | 25 | 61 | 2 | [การเงิน](#fin-data) |
| `projects` | ทะเบียนโครงการ | 13 | 15 | 0 | [ทะเบียนโครงการ](#prj-data) |
| `review` | ทบทวนและวิเคราะห์ | 8 | 12 | 0 | [ทบทวนและวิเคราะห์](#rev-data) |

## Schema `platform` {#dd-plt}

| ตาราง | คอลัมน์หลัก | ชั้นข้อมูล | รหัสการเก็บรักษา | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| `tenant` | `id`, `cell_id`, `status`, `name`, `kind` | Internal | `plt.tenant` | PLT-FR-001, PLT-FR-005 |
| `tenant_setting` | `key`, `value`, `effective_from` | Internal | `plt.tenant` | PLT-FR-003, PLT-FR-004 |
| `unit` | `code`, `parent_id`, `name_th`, `name_en`, `retired_on`, `retired_why` | Internal | `plt.org` | PLT-FR-022, PLT-FR-023 |
| `subject` | `subject_ref`, `details_enc`, `key_ref`, `erased_at` | Restricted | `plt.subject` | PLT-DR-003, PLT-FR-115 |
| `user_account` | `subject_ref`, `role_id`, `unit_id`, `status`, `suspended_at`, `suspended_why`, `version` | Confidential | `plt.org` | PLT-FR-024 ถึง PLT-FR-028 |
| `role`, `role_authority` | `id`, `name_th`, `name_en`; `authority` | Internal | `plt.org` | PLT-FR-031, PLT-FR-037 |
| `sod_switch` | `rule_id`, `enabled`, `why`, `changed_by_ref` | Internal | `plt.sod` | PLT-FR-043, PLT-FR-044 |
| `sod_block` | `at`, `actor_ref`, `role_id`, `rule_id`, `item`, `clash_ref`, `delegation_id` | Confidential | `plt.sod` | PLT-FR-040, PLT-FR-045 |
| `delegation` | `no`, `delegator_id`, `delegate_id`, `scope`, `start_on`, `end_on`, `why`, `overlap_why`, `revoked_at`, `revoked_why` | Confidential | `plt.delegation` | PLT-FR-047 ถึง PLT-FR-061, PLT-DR-001 |
| `approval_chain`, `approval_step` | `key`, `version`, `effective_from`; `seq`, `owner_role`, `sla_days`, `condition`, `amount`, `locked` | Internal | `plt.approval` | PLT-FR-062, PLT-FR-063, PLT-FR-066 |
| `approval_instance`, `step_decision` | `chain_id`, `subject_type`, `subject_id`, `current_seq`; `seq`, `decider_ref`, `holder_ref`, `delegation_id`, `result`, `why` | Confidential | `plt.approval` | PLT-FR-064, PLT-FR-065, PLT-FR-067, PLT-FR-068 |
| `notice_template` | `event_key`, `subject_th`, `subject_en`, `body_th`, `body_en`, `channels` | Internal | `plt.notice` | PLT-FR-072 |
| `escalation_rule` | `step_id`, `remind_days`, `after_days`, `to_role` | Internal | `plt.notice` | PLT-FR-076 |
| `notice`, `notice_read` | `template_key`, `params`, `audience`, `link`; `notice_id`, `user_id`, `read_at` | Confidential | `plt.notice` | PLT-FR-069 ถึง PLT-FR-071 |
| `work_item` | `kind`, `title_key`, `params`, `assignee_user`, `assignee_role`, `assignee_unit`, `due_on`, `link`, `severity`, `state`, `instance_id` | Internal | `plt.work` | PLT-FR-079 ถึง PLT-FR-085 |
| `page_pin`, `page_recent` | `user_id`, `link`, `label`, `at` | Internal | `plt.work` | PLT-FR-086 |
| `audit_entry` | `seq`, `at`, `subject_ref`, `role_id`, `action`, `item_type`, `item_id`, `outcome`, `delegation_no`, `prev_hash`, `hash` | Internal | `plt.audit` | PLT-FR-087 ถึง PLT-FR-094 |
| `audit_checkpoint` | `seq`, `hash`, `at`, `store_ref` | Internal | `plt.audit` | PLT-FR-092 |
| `fiscal_year` | `fy`, `status`, `start_on`, `end_on`, `status_why` | Internal | `plt.master` | PLT-FR-097 ถึง PLT-FR-099 |
| `calendar_milestone`, `holiday` | `fy`, `name`, `on_date`, `owner_role`, `custom`; `day`, `name` | Internal | `plt.master` | PLT-FR-100, PLT-FR-101 |
| `budget_type`, `standard_price` | `code`, `name`; `no`, `type_id`, `name`, `unit`, `price`, `retired_on` | Internal | `plt.master` | PLT-FR-102, PLT-FR-103 |
| `policy_page`, `policy_version` | `kind`; `version_no`, `body_th`, `body_en`, `published_on` | Public | `plt.site` | PLT-FR-105 ถึง PLT-FR-107 |
| `retention_rule` | `key`, `years`, `basis`, `legal_min_years` | Internal | `plt.privacy.case` | PLT-FR-109 ถึง PLT-FR-112 |
| `data_dictionary_entry` | `module`, `table_name`, `column_name`, `class`, `purpose`, `legal_basis`, `retention_key` | Internal | `plt.privacy.case` | PLT-FR-113 |
| `data_subject_request` | `kind`, `requester_ref`, `due_on`, `state`, `owner_ref`, `evidence_key`, `refusal_basis` | Confidential | `plt.privacy.case` | PLT-FR-114 |
| `breach_case` | `aware_at`, `risk`, `pdpc_told_at`, `subjects_told_at`, `controller_told_at`, `state` | Confidential | `plt.privacy.case` | PLT-FR-116 |
| `processing_activity` | `role`, `purpose`, `categories`, `recipients`, `retention_key` | Internal | `plt.privacy.case` | PLT-FR-117 |
| `consent_record` | `subject_ref`, `purpose`, `notice_version`, `given_at`, `withdrawn_at` | Confidential | `plt.privacy.case` | PLT-FR-119 |
| `ai_thread`, `ai_message`, `ai_use` | `user_id`, `title`, `agent`, `pinned`; `role`, `text_enc`, `steps`; `agent`, `user_ref`, `action`, `target`, `source_count` | Confidential | `plt.ai.use` | PLT-FR-127 ถึง PLT-FR-135, PLT-DR-007 |
| `interface_status`, `backup_status` | `interface_id`, `direction`, `method`, `status`, `last_run_at`, `row_count`; `full_at`, `incremental_at`, `restore_test_at` | Internal | `plt.ops` | PLT-FR-139, PLT-FR-140, PLT-IR-006 |
| `operator_access` | `operator_ref`, `tenant_id`, `reason`, `approved_by`, `from_at`, `to_at` | Confidential | `plt.audit` | ADR-0013 |
| `outbox_event` | `event_id`, `type`, `payload`, `published_at` | Internal | `plt.outbox` | ADR-0008 |

บทการทบทวนขอเพิ่มอีกสามตารางใน schema นี้ และยังเป็นคำขอจนกว่าจะตัดสิน DG-REV-01

| ตาราง | คอลัมน์หลัก | ชั้นข้อมูล | รหัสการเก็บรักษา | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| `agent_profile` | `agent`, `module`, `enabled`, `level`, `changed_by_ref`, `why` | Internal | `plt.ai.use` | REV-FR-035, REV-FR-049, REV-FR-050 |
| `agent_run` | `agent`, `starter_ref`, `level`, `status`, `started_at`, `stop_why` | Confidential | `plt.ai.use` | REV-FR-037, REV-DR-001 |
| `agent_step` | `run_id`, `seq`, `tool`, `kind`, `status`, `output_ref`, `change`, `decided_by_ref`, `decided_ms` | Confidential | `plt.ai.use` | REV-FR-037, REV-FR-041, REV-FR-047 |

ฟิลด์ส่วนบุคคลและฟิลด์จำกัด

| ฟิลด์ | ชั้นข้อมูล | การป้องกัน | กฎ |
| --- | --- | --- | --- |
| `subject.details_enc` | Restricted | AES-256-GCM ผ่าน Tink ด้วยกุญแจรายบุคคลที่ห่อด้วยกุญแจ tenant | การทำลายกุญแจคือการลบบุคคล (ADR-0015) |
| คอลัมน์ `*_ref` | Confidential | รหัสอ้างอิงแทนตัวบุคคล | รายงานแสดงข้อความแทนหลังลบ |
| `delegation.why`, `user_account.suspended_why`, `step_decision.why` | Confidential | เข้ารหัสในที่เก็บ เข้าถึงตามบทบาท | อยู่ในรายการธุรกิจ ไม่อยู่ในบันทึก (PLT-DR-004) |
| `ai_message.text_enc` และไฟล์แนบ | Confidential และอาจเป็น Restricted | เข้ารหัสฟิลด์ เจ้าของเท่านั้น สแกนไฟล์ด้วย ClamAV | ระยะเวลาตามประเภทประวัติการสนทนา (PLT-DR-007) |
| `notice.params` | Confidential | รหัสอ้างอิง ไม่มีชื่อ | สร้างข้อความตอนอ่าน |
| `data_subject_request`, `breach_case` | Confidential | เข้าถึงตามบทบาทของเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล | ไฟล์หลักฐานใช้กุญแจ tenant |

## Schema `budget` {#dd-bgt}

| ตาราง | คอลัมน์หลัก | ชั้นข้อมูล | รหัสการเก็บรักษา | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| `strategy`, `goal`, `kpi`, `kpi_target`, `kpi_activity` | `fy`, `name`, `nat`, `mp`, `min_share`, `retired_at`; `unit`, `owner_unit_id`, `base`, `formula`; `year`, `target` | ภายใน | `bgt.plan` | BGT-FR-004 to BGT-FR-009 |
| `project_idea`, `target_revision` | `no`, `unit_id`, `kpi_id`, `name`, `estimate`, `years`, `status`, `scores`; `year`, `from_value`, `to_value`, `why`, `status` | ภายใน | `bgt.plan` | BGT-FR-010 to BGT-FR-014 |
| `budget_request` | `fy`, `no`, `unit_id`, `activity_id`, `status`, `track`, `prev_amount`, `amount`, `decided`, `reason`, `kpi_text`, `multi`, `zbb_ask`, `zbb_note`, `sent_once`, `rule_set_version` | ภายใน | `bgt.request` | BGT-FR-017 to BGT-FR-036 |
| `request_line`, `request_year`, `request_quarter` | `type`, `name`, `qty`, `unit_name`, `price`, `location`, `lat`, `lng`, `price_source`, `price_date`; `year`, `amount`; `quarter`, `amount` | ภายใน | `bgt.request` | BGT-FR-020, BGT-FR-023, BGT-FR-025, BGT-FR-028 |
| `request_readiness`, `request_risk` | `site`, `staff`, `mgmt`, `mat`, `forest`, `eia`, `evals`; `type`, `level`, `fix` | ภายใน | `bgt.request` | BGT-FR-024 |
| `request_document` | `kind`, `file_key`, `name` | ลับ | `bgt.request` | BGT-FR-026, BGT-FR-027, BGT-DR-007 |
| `request_version`, `request_comment`, `request_payroll` | `version_no`, `snapshot` (jsonb), `why`; `line_key`, `text`, `author_ref`, `resolved_at`; `rows` (jsonb) | ลับ | `bgt.request` | BGT-DR-002, BGT-FR-029, BGT-FR-057 |
| `ceiling_issue`, `unit_ceiling`, `ceiling_reply` | `fy`, `ceiling`, `project_ceiling`, `issued_on`, `due_on`, `version_no`; `unit_id`, `amount`; `state`, `amount`, `why` | ภายใน | `bgt.request` | BGT-FR-040 to BGT-FR-045 |
| `priority_score`, `criterion`, `duplicate_mark` | `request_id`, `criterion_id`, `value`; `name`, `weight`; `keep_id`, `merge_id`, `overlap`, `state` | ภายใน | `bgt.request` | BGT-FR-046 to BGT-FR-049 |
| `review_row`, `amount_change` | `request_id`, `requested`, `round2`, `round3`; `round`, `from_amount`, `to_amount`, `why`, `actor_ref`, `at` | ภายใน | `bgt.request` | BGT-FR-059, BGT-DR-001 |
| `meeting`, `meeting_member`, `vote`, `resolution` | `no`, `held_on`, `place`, `status`, `minutes`, `certified_at`; `subject_ref`, `present`; `request_id`, `choice`, `abstained`; `amount`, `note`, `cut_impact` (jsonb) | ลับ | `bgt.meeting` | BGT-FR-067 to BGT-FR-074 |
| `hearing`, `hearing_question` | `unit_id`, `held_on`, `who`, `status`; `question`, `answer` | ภายใน | `bgt.meeting` | BGT-FR-075 |
| `minister_approval`, `submission_batch`, `batch_request`, `batch_result`, `revision_request` | `fy`, `letter_no`, `on_date`; `no`, `status`, `channel`, `simulated`; `request_id`, `amount`; `amount`; `no`, `due_on`, `issue`, `reply` | ภายใน | `bgt.submission` | BGT-FR-076 to BGT-FR-084 |
| `budget_bill`, `bill_stage`, `bill_item`, `bill_cut`, `bill_appeal` | `fy`, `stage`; `stage_no`, `on_date`; `request_id`, `amount`; `amount`, `why`; `amount`, `why`, `restored`, `withdrawn_at` | ภายใน | `bgt.submission` | BGT-FR-087 to BGT-FR-093 |
| `appropriation`, `appropriation_type` | `fy`, `act`, `act_on`, `from_act`; `type`, `amount` | ภายใน | `bgt.line` | BGT-FR-094 |
| `allocation_line` | `fy`, `no`, `unit_id`, `name`, `type`, `activity_id`, `request_id`, `amount`, `status`, `new_project`, `extended`, `secret_fund`, `cancel_amount`, `cancel_why` | ภายใน | `bgt.line` | BGT-FR-098 to BGT-FR-103, BGT-DR-004 |
| `spending_plan`, `plan_month`, `plan_sent` | `line_id`, `version_no`, `reason`, `note`; `month`, `amount`; `fy`, `sent_on` | ภายใน | `bgt.line` | BGT-FR-105 to BGT-FR-107 |
| `release`, `regional_allotment` | `no`, `quarter`, `type`, `amount`, `status`, `letter_no`; `line_id`, `due_on`, `sent_on` | ภายใน | `bgt.line` | BGT-FR-108 to BGT-FR-110 |
| `line_balance`, `ledger_entry` | `line_id`, `amount`, `reserved`, `committed`, `held`, `paid`; `kind`, `amount`, `source_module`, `source_ref`, `at` | ภายใน | `bgt.ledger` | BGT-FR-112 to BGT-FR-114, BGT-IR-001 |
| `line_disbursement` | `line_id`, `month`, `amount`, `source`, `import_ref` | ภายใน | `bgt.ledger` | BGT-IR-005 |
| `transfer` | `fy`, `no`, `from_line`, `to_line`, `amount`, `type`, `reason`, `why`, `status`, `report_due`, `reported_on`, `bureau_on`, `act_ref`, `prepared_by_ref`, `decided_by_ref`, `rule_set_version` | ภายใน | `bgt.line` | BGT-FR-115 to BGT-FR-125 |
| `carry_over`, `carried_fund`, `carried_payment`, `saving` | `no`, `line_id`, `amount`, `po`, `po_on`, `status`; `due_on`, `paid`, `status`; `amount`, `on_date`; `contract_ref`, `amount`, `use` | ภายใน | `bgt.line` | BGT-FR-126 to BGT-FR-132 |
| `progress_report`, `spend_alert` | `line_id`, `month`, `pct`, `status`, `issue`, `next_amount`; `kind`, `acknowledged_by_ref` | ภายใน | `bgt.result` | BGT-FR-137, BGT-FR-139 |
| `line_month` | `line_id`, `month`, `plan`, `actual`, `reserved`, `committed` | ภายใน | สร้างใหม่ได้ | BGT-FR-133 |
| `output`, `kpi_result`, `report_round`, `quarter_report`, `report_item`, `report_evidence` | `line_id`, `name`, `unit`, `target`, `retired_at`; `result`; `round`, `due_on`; `status`, `sent_at`, `certified_on`; `result`, `problem`, `fix`; `file_key` | ภายใน | `bgt.result` | BGT-FR-142 to BGT-FR-150 |
| `evaluation`, `recommendation`, `public_summary` | `no`, `proj`, `scores`, `findings`, `lessons`, `status`; `no`, `text`, `source`, `unit_id`, `due_on`, `status`, `action`, `idea_id`; `fy`, `approved_on` | ภายใน | `bgt.result` | BGT-FR-151 to BGT-FR-155 |
| `structure_node`, `committee_roster`, `master_plan`, `budget_setting`, `rule_switch` | `fy`, `level`, `code`, `name`, `parent_id`, `retired_at`; `subject_ref`, `role`; `name`; `key`, `value`, `fy`; `rule_id`, `on`, `effect` | ภายใน | `bgt.config` | BGT-FR-156 to BGT-FR-161 |
| `agent_run`, `ai_use`, `scenario`, `anomaly` | `agent`, `steps`, `status`; `tool`, `user_ref`, `target`, `version`; `name`, `kind`, `params` (jsonb), `owner_ref`; `kind`, `risk`, `status`, `note`, `reopened` (jsonb) | ลับ | `bgt.ai` | BGT-FR-163 to BGT-FR-171 |
| `number_series`, `number_log` | `doc_type`, `fy`, `last_no`; `no`, `ref` | ภายใน | `bgt.config` | BR-BGT-37, BGT-DR-005 |
| `outbox_event` | `event_id`, `type`, `payload`, `published_at` | ภายใน | สั้น กำหนดร่วมกับแพลตฟอร์ม | ADR-0008 |

ฟิลด์ส่วนบุคคลและฟิลด์จำกัด

| ฟิลด์ | ชั้นข้อมูล | การป้องกัน | กฎ |
| --- | --- | --- | --- |
| `*_ref` columns | ลับ | อ้างอิงแบบนามแฝง ชื่อจริงอยู่ในตาราง subject ของ platform | รายงานแสดงตัวแทนหลังการลบ (ADR-0015) |
| `vote.choice` | ลับ | จำกัดตามบทบาท ไม่ทำดัชนีค้นหา | BGT-NFR-007 |
| `request_payroll.rows` | ลับ อาจจำกัดการเข้าถึง | เก็บเฉพาะยอดสรุป ไม่มีเลขประจำตัวประชาชน | DG-BGT-07 |
| `report_evidence`, `request_document` files | อาจจำกัดการเข้าถึง | สแกนด้วย ClamAV ใช้กุญแจของ tenant ไม่ทำดัชนีข้อความ | ภาพหรือเอกสารอาจมีบุคคล |

## Schema `procurement` {#dd-prc}

| ตาราง | คอลัมน์หลัก | ชั้นข้อมูล | รหัสการเก็บรักษา | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| `plan_item` | `line_id`, `no`, `name`, `estimate`, `planned_on`, `category_id`, `kind`, `status` | Internal | `prc.plan` | PRC-FR-001 ถึง PRC-FR-005 |
| `plan_version` | `version_no`, `status`, `why`, `snapshot` (jsonb), `egp_notice_no`, `decided_by_ref` | Internal | `prc.plan` | PRC-DR-001, PRC-FR-006 ถึง PRC-FR-008 |
| `requisition` | `plan_item_id`, `no`, `amount`, `why`, `needed_on`, `status`, `split_why`, `for_unit_id`, `reservation_ref` | Internal | `prc.case` | PRC-FR-012 ถึง PRC-FR-025 |
| `procurement_case` | `plan_item_id`, `requisition_id`, `no`, `kind`, `method`, `stored_step`, `display_step`, `cancelled_why`, `closed_at`, `lessons`, `supplier_score` | Internal | `prc.case` | PRC-FR-026 ถึง PRC-FR-035 |
| `case_event` | `case_id`, `at`, `type`, `actor_ref`, `detail`, `step` | Confidential | `prc.case` | PRC-FR-029, PRC-DR-005 |
| `method_decision` | `case_id`, `advised`, `chosen`, `why`, `special`, `rule_id`, `rule_effective_on`, `rule_set_version`, `approval_status` | Internal | `prc.case` | PRC-FR-036 ถึง PRC-FR-044 |
| `reference_price`, `market_entry` | `case_id`, `amount`, `basis`, `note`; `vendor`, `price`, `source`, `date` | Internal | `prc.case` | PRC-FR-049 ถึง PRC-FR-051 |
| `tor_template`, `tor_template_version` | `kind`, `version_no`, `file_key`, `status`, `proposed_by_ref` | Internal | `prc.config` | PRC-FR-046 ถึง PRC-FR-048 |
| `hearing`, `hearing_comment` | `case_id`, `notice_no`, `from_on`, `to_on`, `conclusion`, `revision_no` | Public หลังเผยแพร่ | `prc.case` | PRC-FR-052, PRC-FR-053 |
| `sourcing_round` | `case_id`, `round_no`, `outcome`, `why`, `egp_no`, `announced_on`, `closes_on`, `bidders` | Public หลังประกาศ | `prc.case` | PRC-FR-030, PRC-FR-054, PRC-DR-002 |
| `bid`, `bid_detail` | `round_id`, `supplier_id`, `bidder_name`, `price`; ผู้ผลิต ประเทศ ยี่ห้อ รุ่น ความแตกต่าง | Confidential จนกว่าจะประกาศผล | `prc.bid` | PRC-FR-058, PRC-FR-059, PRC-FR-066, PRC-NFR-007 |
| `criterion`, `evaluation_score` | `round_id`, `name`, `weight`; `member_ref`, `bid_id`, `criterion_id`, `value` | Confidential | `prc.bid` | PRC-FR-062 ถึง PRC-FR-065 |
| `quotation` | `round_id`, `supplier_id`, `price`, `chosen` | Confidential จนกว่าจะประกาศผล | `prc.bid` | PRC-FR-060 |
| `rfq`, `rfq_reply` | `round_id`, `doc_no`, `reply_by`; `supplier_id`, `sealed_payload`, `sealing_key_ref`, `opened_at`, `price` | Confidential ปิดผนึกจนถึงวันตอบ | `prc.bid` | PRC-FR-061, PRC-IR-010 |
| `award`, `appeal`, `appeal_forward` | `round_id`, `supplier_id`, `price`, `awarded_on`, `resolution`, `appeal_end_on`; `appellant`, `grounds`, `status`, `decision_why`; `doc_no`, `result` | Public หลังประกาศ ยกเว้นเหตุผล | `prc.case` | PRC-FR-069 ถึง PRC-FR-078 |
| `committee`, `committee_member`, `declaration` | `case_id`, `type`, `order_no`, `order_on`; `subject_ref`, `role`; `round_id`, `conflict`, `bidder`, `entered_by_ref` | Confidential | `prc.case` | PRC-FR-081 ถึง PRC-FR-084 |
| `committee_meeting` | `committee_id`, `held_on`, `attendance`, `resolution` | Confidential | `prc.case` | PRC-FR-087 |
| `fee_claim`, `fee_claim_row` | `doc_no`, `case_id`, `status`, `total`; `subject_ref`, `dates`, `amount` | Confidential | `prc.fee` | PRC-FR-089 ถึง PRC-FR-091 |
| `bid_security` | `round_id`, `bidder_name`, `type`, `amount`, `valid_to`, `status`, `reason` | Internal | `prc.bid` | PRC-FR-092 ถึง PRC-FR-096 |
| `sample_test` | `bid_id` วันที่รับ ส่ง เริ่ม เสร็จ แจ้ง และตอบ `report_no`, `result` | Confidential | `prc.bid` | PRC-FR-068 |
| `contract` | `case_id`, `supplier_id`, `no`, `status`, `signed_on`, `signed_amount`, `amount`, `version_no`, `penalty_rate`, `penalty_min`, `rule_set_version`, `warranty_months`, `erp_refs` (jsonb) | Public หลังลงนาม | `prc.contract` | PRC-FR-097 ถึง PRC-FR-103, PRC-IR-015, PRC-DR-003 |
| `contract_version`, `variation`, `termination` | `version_no`, `amount`, `why`; `kind`, `delta`, `days`, `cause`, `decider`, `status`, `proposed_by_ref`, `decided_by_ref`; `grounds`, `status` | Internal | `prc.contract` | PRC-FR-133 ถึง PRC-FR-141 |
| `acceptance_committee` | `contract_id`, `subject_ref` | Confidential | `prc.acceptance` | PRC-FR-085, PRC-FR-086 |
| `phase` | `contract_id`, `phase_no`, `name`, `due_on`, `amount`, `need`, `ext_days`, `ext_days_vendor`, `delivered_on`, `delivery_ref`, `result`, `ok_amount`, `cancelled_on` | Internal | `prc.acceptance` | PRC-FR-100, PRC-FR-107 ถึง PRC-FR-114 |
| `acceptance_signature`, `acceptance_dissent`, `acceptance_certificate` | `phase_id`, `subject_ref`, `signed_at`; `note`, `resolved_by_ref`; `copies`, `file_key` | Confidential | `prc.acceptance` | PRC-FR-110 ถึง PRC-FR-115 |
| `invoice` | `phase_id`, `no`, `amount`, `issued_on`, `status`, `return_why` | Internal | `prc.acceptance` | PRC-FR-116, PRC-FR-117 |
| `gate_hold`, `waiver` | `phase_id`, `failures`, `released_by_ref`, `reason`; `amount`, `status`, `doc`, `why` | Internal | `prc.acceptance` | PRC-FR-119, PRC-FR-125, PRC-FR-126 |
| `guarantee`, `guarantee_extension` | `contract_id`, `type`, `ref`, `amount`, `expires_on`, `status`; `from_on`, `to_on` | Internal | `prc.contract` | PRC-FR-127 ถึง PRC-FR-131 |
| `defect`, `supplier_letter` | `contract_id`, `fix_by`, `status`; `type`, `text`, `sent_on` | Internal | `prc.contract` | PRC-FR-079, PRC-FR-132 |
| `supervision`, `supervision_report`, `assessment` | `contract_id`, `supervisor_ref`; `progress`, `note`; `checkpoint`, `result` | Confidential | `prc.contract` | PRC-FR-143 ถึง PRC-FR-148 |
| `drawing_round`, `boq_item`, `serial_no` | `contract_id`, `round_no`, `status`; `unit`, `quantity`, `unit_price`; `serial` | Internal | `prc.contract` | PRC-FR-104 ถึง PRC-FR-106 |
| `supplier` | `name`, `normal_name`, `type`, `sme`, `local`, `status`, `tax_id_enc`, `tax_id_bidx`, `contact_enc`, `sme_cert`, `mit_cert` | Confidential เลขผู้เสียภาษีเป็น Restricted | `prc.supplier` | PRC-FR-149, PRC-FR-150 |
| `abandoned_list_row`, `abandoned_import`, `blacklist_release` | `name`, `normal_name`, `tax_id_bidx`, `since_on`, `ref`; `file_key`, `rows`; `case_id`, `evidence` | Confidential | `prc.supplier` | PRC-FR-151 ถึง PRC-FR-153 |
| `entity_check` | `supplier_id`, `status`, `checked_at` | Internal | `prc.supplier` | PRC-FR-154 |
| `number_series`, `number_log` | `doc_type`, `fiscal_year`, `unit_code`, `last_no`, `format`; `no`, `ref`, `issued_by_ref` | Internal | `prc.config` | PRC-FR-155, PRC-FR-156, BR-PRC-33 |
| `form_document`, `reminder` | `template`, `case_id`, `no`, `text`, `sign_state`, `file_key`, `channel`; `target`, `sent_at` | Confidential | `prc.case` | PRC-FR-157 ถึง PRC-FR-160 |
| `incoming_document`, `incoming_field` | `type`, `source`, `status`, `file_key`; `name`, `value`, `original`, `confidence`, `checked` | Confidential | `prc.intake` | PRC-FR-161 ถึง PRC-FR-163 |
| `egp_import`, `egp_import_row` | `file_hash`, `imported_by_ref`, `ok_count`, `skipped_count`; `plan_no`, `egp_no`, `stage`, `stage_on` | Internal | `prc.plan` | PRC-IR-001, PRC-IR-002 |
| `monthly_summary`, `red_flag` | `month`, `rows` (jsonb), `published_at`; `signal`, `target`, `score`, `status`, `evidence`, `note` | Public หลังเผยแพร่; Confidential | `prc.report` | PRC-FR-164, PRC-FR-171 ถึง PRC-FR-175 |
| `procurement_setting`, `procurement_profile`, `method_rule`, `category` | `key`, `value`, `effective_from`; `kind`, `switches`; `rule_id`, `condition`, `method`, `ceiling`, `on`; `kind` | Internal | `prc.config` | PRC-FR-040 ถึง PRC-FR-042, PRC-FR-176 ถึง PRC-FR-179 |
| `outbox_event` | `event_id`, `type`, `payload`, `published_at` | Internal | สั้น กำหนดร่วมกับ platform | ADR-0008 |

ฟิลด์ส่วนบุคคลและฟิลด์จำกัด

| ฟิลด์ | ชั้นข้อมูล | การป้องกัน | กฎ |
| --- | --- | --- | --- |
| `supplier.tax_id_enc` | Restricted | เข้ารหัสฟิลด์ AES-256-GCM ผ่าน Tink คีย์แยกต่อหน่วยงาน และบันทึกการเปิดดู | เลขของบุคคลธรรมดาถูกปิดบังนอกบทบาทพัสดุ (PRC-DR-009) |
| `supplier.tax_id_bidx`, `abandoned_list_row.tax_id_bidx` | Restricted | blind index แบบมีคีย์และมีคีย์ของตนเอง | ใช้จับคู่ตรงตัวเท่านั้น สำหรับ PRC-FR-149 และ BR-PRC-22 |
| `supplier.contact_enc` | Confidential | เก็บแบบเข้ารหัส และเข้าถึงตามบทบาท | อีเมลและการติดต่อของผู้ขายบุคคลธรรมดา |
| คอลัมน์ `*_ref` | Confidential | รหัสแฝง ชื่อจริงอยู่ในตาราง subject ของ platform | รายงานแสดงตัวแทนเมื่อลบแล้ว (ADR-0015) |
| `declaration`, `evaluation_score` | Confidential | เข้าถึงตามบทบาท และไม่เข้าดัชนีค้นหาก่อนประกาศผล | ไม่ส่งออกใน OCDS (PRC-IR-014) |
| `rfq_reply.sealed_payload` | Confidential | ปิดผนึกตาม ADR-0013 ดูหัวข้อความมั่นคงปลอดภัย | อ่านไม่ได้ก่อนวันตอบ |
| ไฟล์ `incoming_document` | อาจเป็น Restricted | สแกน ClamAV คีย์แยกต่อหน่วยงาน และไม่ทำดัชนีข้อความก่อนยืนยัน | เอกสารอาจมีเลขบัตรหรือบัญชีธนาคาร |

## Schema `finance` {#dd-fin}

| ตาราง | คอลัมน์หลัก | ชั้นข้อมูล | รหัสการเก็บรักษา | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| `commitment`, `commitment_release` | `kind`, `line_id`, `name`, `payee`, `amount`, `released`, `paid`, `due_on`, `ledger_ref`; `amount`, `why` | Internal | `fin.commitment` | FIN-FR-008 ถึง FIN-FR-012 |
| `purchase_order`, `purchase_order_history` | `source_type`, `source_id`, `no`, `recorded_at`; `until`, `why` | Internal | `fin.commitment` | FIN-FR-013, FIN-FR-014 |
| `voucher` | `no`, `type`, `state`, `commitment_id`, `contract_id`, `phase_no`, `plan_line_id`, `line_id`, `payee_name`, `payee_kind`, `payee_tax_enc`, `supplier_id`, `bank_account_id`, `gross`, `vat`, `penalty`, `other`, `wht`, `net`, `route`, `method`, `method_why`, `due_on`, `rule_set_version`, `gate_snapshot` (jsonb) | Confidential เลขประจำตัวผู้เสียภาษีเป็น Restricted | `fin.voucher` | FIN-FR-017 ถึง FIN-FR-040 |
| `voucher_evidence`, `voucher_log`, `voucher_hold` | `item`, `ok`, `file_key`; `action`, `actor_ref`, `role`, `note`; `amount`, `ledger_ref` | Confidential | `fin.voucher` | FIN-FR-024, FIN-DR-002, BR-FIN-03 |
| `authority_row`, `voucher_approval` | `level`, `position`, `role`, `max_amount`; `decided_by_ref`, `holder_ref`, `via`, `level` | Internal | `fin.voucher` | FIN-FR-003, FIN-FR-036 |
| `gfmis_file`, `gfmis_file_row` | `no`, `state`, `sent_at`; `posting_result`, `doc_no`, `payment_result`, `why`, `simulated` | Confidential | `fin.gfmis` | FIN-FR-041 ถึง FIN-FR-044 |
| `payment_batch`, `payment_batch_row` | `no`, `state`, `total`; `result`, `why` | Confidential | `fin.gfmis` | FIN-FR-045 |
| `tax_certificate`, `refund` | `voucher_id`, `no`, `base`, `tax`, `sent_at`, `replaces_id`, `cancel_why`; `receipt_id`, `amount`, `in_year` | Confidential | `fin.voucher` | FIN-FR-048 ถึง FIN-FR-051 |
| `daily_payment_check`, `daily_payment_row` | `checked_by_ref`, `at`; `voucher_id`, `ok`, `note` | Internal | `fin.voucher` | FIN-FR-050 |
| `supplier_bank_account`, `bank_change` | `supplier_id`, `bank`, `acct_enc`, `acct_bidx`, `from_at`, `until_at`; `status`, `acct_enc`, `evidence_key`, `source`, `requested_by_ref`, `decided_by_ref`, `verified_contact`, `why` | Restricted | `fin.bank` | FIN-FR-053 ถึง FIN-FR-061 |
| `advance`, `advance_item`, `advance_clearing`, `advance_demand` | `no`, `contract_no`, `borrower_ref`, `unit_id`, `type`, `state`, `start_on`, `end_on`, `returned_on`, `amount`, `approved_amt`, `source`, `line_id`, `plan_line_id`, `collateral_enc`; `kind`, `amount`; `spent`, `sent_at`, `receipt_no`, `cash_back`; `due_on`, `moves` | Confidential | `fin.advance` | FIN-FR-062 ถึง FIN-FR-077 |
| `receipt_book`, `receipt_book_void`, `receipt_book_report` | `no`, `fiscal_year`, `from_no`, `to_no`, `holder_ref`, `returned_on`; `from_no`, `to_no`, `why` | Internal | `fin.receipt` | FIN-FR-082, FIN-FR-083 |
| `receipt` | `book_id`, `n`, `on_date`, `kind`, `payer`, `amount`, `method`, `fund_id`, `gfmis_doc`, `remittance_id`, `cancelled_why`, `replaces_id`, `voucher_id`, `advance_id` | Confidential | `fin.receipt` | FIN-FR-078 ถึง FIN-FR-081 |
| `remittance` | `no`, `cls`, `amount`, `bank_ref`, `late_count`, `gfmis_doc`, `reversed_why` | Internal | `fin.receipt` | FIN-FR-085, FIN-FR-086 |
| `cash_order`, `cash_order_member` | `order_no`, `from_on`, `cancelled_why`; `subject_ref`, `role` | Confidential | `fin.cash` | FIN-FR-087 |
| `daily_cash`, `cash_count`, `key_handover` | `on_date`, `sys_cash`, `sys_cheque`, `sys_by_class`, `status`, `ack_by_ref`, `late_why`; `member_ref`, `round_no`, `cash`, `cheque`; `from_ref`, `to_ref`, `at` | Confidential | `fin.cash` | FIN-FR-088 ถึง FIN-FR-095 |
| `fund`, `spending_plan`, `spending_plan_line`, `treasury_withdrawal` | `no`, `name`, `basis`, `open_agency`, `open_treasury`, `closed_why`; `fund_id`, `fiscal_year`, `status`, `version_no`, `parent_id`; `name`, `cat`, `amount`; `amount`, `status`, `doc_no`, `back_amount` | Internal | `fin.nonbudget` | FIN-FR-096 ถึง FIN-FR-104 |
| `bank_statement`, `bank_line`, `book_adjustment`, `bank_reconciliation` | `acct`, `month`, `opening`, `file_key`, `removed_why`; `ref`, `amount`; `ref`, `reversed_why`; `status`, `diff`, `signed_by_ref`, `log` | Confidential | `fin.recon` | FIN-FR-105 ถึง FIN-FR-110 |
| `gfmis_report`, `trial_balance`, `payment_file`, `payment_file_row` | `kind`, `month`, `file_key`, `replaced_why`; `rows`, `agrees`; `imported_by_ref`, `undone_why`; `voucher_id`, `doc_no`, `amount`, `state`, `note`, `matched_by_ref` | Confidential | `fin.recon` | FIN-FR-111 ถึง FIN-FR-117 |
| `gfmis_assignment` | `subject_ref`, `duties`, `order_no`, `until_on`, `revoked_why` | Internal | `fin.config` | FIN-FR-118 |
| `period`, `day_close`, `close_check` | `month`, `status`, `closed_by_ref`, `why`; `on_date`, `why`; `check_no`, `ok`, `detail` | Internal | `fin.close` | FIN-FR-120 ถึง FIN-FR-124 |
| `audit_query`, `audit_query_note` | `no`, `source`, `subject`, `received_on`, `due_on`, `draft`, `answer`, `answered_by_ref`; `text` | Confidential | `fin.audit` | FIN-FR-130 ถึง FIN-FR-132 |
| `finance_setting`, `number_series`, `number_log` | `key`, `value`, `effective_from`; ตามบท Procurement | Internal | `fin.config` | FIN-FR-001, BR-FIN-15 |
| `agent_run`, `what_if`, `signal_state` | `agent`, `steps`, `status`; `levers`, `result`; `signal_key`, `status`, `note` | Confidential | `fin.ai` | FIN-FR-133 ถึง FIN-FR-139 |
| `outbox_event`, `inbox_event`, `delivery` | ตามบทการเชื่อมต่อ | Internal | ระยะสั้น กำหนดร่วมกับ platform | ADR-0008 |

ฟิลด์ส่วนบุคคลและฟิลด์จำกัด

| ฟิลด์ | ชั้นข้อมูล | การป้องกัน | กฎ |
| --- | --- | --- | --- |
| `supplier_bank_account.acct_enc`, `bank_change.acct_enc` | Restricted | เข้ารหัสฟิลด์ AES-256-GCM ผ่าน Tink คีย์แยกต่อหน่วยงาน และบันทึกการเปิดดู | ปิดบังในทุกหน้าจอและการส่งออก (XC-SEC-026) |
| `supplier_bank_account.acct_bidx` | Restricted | blind index แบบมีคีย์และมีคีย์ของตนเอง | ใช้จับคู่ตรงตัวเท่านั้น เพื่อหาบัญชีเดียวกันบนผู้ขายสองราย |
| `voucher.payee_tax_enc` | Restricted | เช่นเดียวกับข้างต้น | เลขประจำตัวผู้เสียภาษีของบุคคลถูกปิดบังนอกบทบาทด้านการเงิน |
| `advance.collateral_enc` | Confidential | เก็บแบบเข้ารหัส และเข้าถึงตามบทบาท | อาจระบุชื่อผู้ค้ำประกัน |
| คอลัมน์ `*_ref` | Confidential | รหัสแฝง | รายงานแสดงตัวแทนเมื่อลบแล้ว (ADR-0015) |
| ไฟล์หลักฐาน | อาจเป็น Restricted | สแกน ClamAV คีย์แยกต่อหน่วยงาน และไม่ทำดัชนี | อาจมีเลขบัตรหรือบัญชีธนาคาร |

## Schema `projects` {#dd-prj}

| ตาราง | คอลัมน์หลัก | ชั้นข้อมูล | รหัสการเก็บรักษา | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| `project` | `project_no`, `first_fy`, `name`, `unit_id`, `area`, `target`, `exchange_scope`, `ended_at` | Internal | `prj.project` | PRJ-DR-001, PRJ-FR-001 to PRJ-FR-003 |
| `project_link` | `project_id`, `source_type`, `source_id`, `fiscal_year`, `linked_at` | Internal | `prj.project` | PRJ-DR-001 |
| `project_number` | `fiscal_year`, `last_no` | Internal | `prj.config` | PRJ-FR-003 |
| `project_summary` | `project_id`, `step`, `amount`, `base_amount`, `committed`, `paid`, `routine`, `gfmis_as_of`, `refreshed_at` | Internal | สร้างใหม่ได้ | PRJ-DR-002, PRJ-FR-005 |
| `exchange_record` | `project_id`, `state`, `last_hash`, `last_sent_at`, `delivery_id` | Internal | `prj.exchange` | PRJ-FR-032, PRJ-DR-005 |
| `delivery` | ตามบท Integration | Internal | `prj.exchange` | PRJ-IR-005 |
| `pm_message` | `message_id`, `project_id`, `dimension`, `text`, `days`, `amount`, `effect`, `received_at`, `acknowledged_at`, `acknowledged_by_ref` | Confidential | `prj.exchange` | PRJ-DR-006, PRJ-FR-041 to PRJ-FR-046 |
| `data_consumer` | `kind`, `name`, `data_sets`, `channel`, `status`, `schedule` | Internal | `prj.share` | PRJ-FR-048 |
| `share_request` | `consumer_id`, `asked_by_ref`, `why`, `decided_by_ref`, `reason`, `status` | Confidential | `prj.share` | PRJ-FR-051 to PRJ-FR-054 |
| `send_log` | `consumer_id`, `sent_at`, `rows`, `gfmis_as_of`, `sent_by_ref`, `approved_by_ref`, `reason`, `file_key` | Confidential | `prj.share` | PRJ-DR-003, PRJ-DR-004 |
| `registry_setting` | `key`, `value`, `effective_from` | Internal | `prj.config` | PRJ-FR-063, PRJ-FR-064 |
| `tor_module`, `tor_duty` | `no`, `name`, `status`, `ref`, `page`; `group`, `name`, `modules`, `external_flag` | Internal | `prj.config` | PRJ-FR-060, PRJ-FR-061 |
| `outbox_event`, `inbox_event` | `event_id`, `type`, `payload`, `published_at` | Internal | สั้น กำหนดร่วมกับ platform | ADR-0008, XC-API-005 |

ฟิลด์ส่วนบุคคลและฟิลด์จำกัด

| ฟิลด์ | ชั้นข้อมูล | การป้องกัน | กฎ |
| --- | --- | --- | --- |
| คอลัมน์ `*_ref` | Confidential | อ้างอิงแบบนามแฝง | รายงานแสดงตัวแทนหลังการลบ (ADR-0015) |
| `share_request.why`, `send_log.reason`, `pm_message.text` | Confidential | เข้าถึงตามบทบาท ไม่เข้าระบบค้นหา | ข้อความอิสระอาจมีชื่อบุคคล |
| ชื่อผู้ขายบน Project 360 | Confidential | อ่านผ่าน `ContractLookup` และไม่เก็บที่นี่ | DG-PRJ-03 |
| ไฟล์ใน `send_log.file_key` | ตามชุดข้อมูล | เก็บใน S3 ด้วยกุญแจของหน่วยงาน (ADR-0010) | PRJ-DR-007 |

## Schema `review` {#dd-rev}

| ตาราง | คอลัมน์หลัก | ชั้นข้อมูล | รหัสการเก็บรักษา | ข้อกำหนด |
| --- | --- | --- | --- | --- |
| `spending_fact` | `fiscal_year`, `month`, `line_id`, `unit_id`, `type`, `plan`, `reserved`, `committed`, `paid`, `imported`, `as_of` | Internal สร้างใหม่ได้ | ไม่มี สร้างใหม่ | REV-FR-004 ถึง REV-FR-008, REV-DR-003 |
| `project_fact` | `project_id`, `line_id`, `output_target`, `output_result`, `kpi_id`, `as_of` | Internal สร้างใหม่ได้ | ไม่มี สร้างใหม่ | REV-FR-010 ถึง REV-FR-013 |
| `anomaly` | `kind`, `unit_id`, `risk`, `status`, `finding_key`, `supplier_ref`, `detail_key`, `note`, `raised_at` | Confidential | `rev.anomaly` | REV-FR-021 ถึง REV-FR-027 |
| `anomaly_evidence`, `anomaly_event` | `anomaly_id`, `source_ref`, `value`, `date`; `action`, `actor_ref`, `reason` | Confidential | `rev.anomaly` | REV-DR-002 |
| `agenda`, `agenda_item`, `agenda_decision` | `title`, `meeting_on`, `status`; `source_module`, `source_ref`; `text`, `owner_ref`, `due_on` | Confidential | `rev.agenda` | REV-FR-053 ถึง REV-FR-055, REV-DR-006 |
| `review_setting` | `key`, `value`, `effective_from` | Internal | `rev.config` | REV-CR-003 |
| `ai_eval_run`, `ai_eval_case` | `provider`, `model`, `ran_at`, `set_version`; `question_id`, `pass`, `detail` | Internal | `rev.ai` | REV-NFR-001, REV-NFR-002, REV-NFR-005 |
| `outbox_event` | `event_id`, `type`, `payload`, `published_at` | Internal | สั้น กำหนดร่วมกับ platform | ADR-0008 |

ฟิลด์ส่วนบุคคลและฟิลด์จำกัด

| ฟิลด์ | ชั้นข้อมูล | การป้องกัน | กฎ |
| --- | --- | --- | --- |
| `anomaly.supplier_ref` | Confidential | เป็นการอ้างอิง ชื่ออยู่ใน `procurement` | ไม่ส่งให้โมเดลจนกว่า OI-REV-12 จะได้ข้อยุติ |
| คอลัมน์ `*_ref` | Confidential | การอ้างอิงแบบนามแฝง ชื่ออยู่ในตาราง subject ของ platform | รายงานแสดงตัวแทนหลังการลบ (ADR-0015) |
| `agent_step.change` | Confidential | การเข้าถึงตามบทบาท | เก็บค่าที่แสดงให้ผู้ตัดสิน ไม่เก็บค่า Restricted |
| รายการในบันทึกการใช้ AI | Internal | การอ้างอิงระเบียนเท่านั้น | คำถามที่พิมพ์อยู่ใน thread ของเจ้าของ (REV-DR-004) |

## ชื่อที่ใช้ในหลาย schema {#dd-shared}

schema แยกชื่อเหล่านี้ออกจากกัน จึงไม่ชนกันในฐานข้อมูล ตารางแสดงว่ารายการใดตั้งใจให้มีหลายชุด และรายการใดต้องตัดสิน

| ตาราง | Schema | หมายเหตุ |
| --- | --- | --- |
| `agent_run` | budget, finance, platform (คำขอ) | DG-REV-01 ย้ายไป `platform` Procurement ยกเลิกสำเนาแล้ว ส่วนสำเนาที่เหลือในโมดูลอื่นต้องตัดสินเช่นเดียวกัน |
| `ai_use` | budget, platform | Procurement ยกเลิกสำเนาแล้วตาม DG-REV-01 ส่วน `budget` ต้องตัดสินเช่นเดียวกัน |
| `anomaly` | budget, review | `budget` เก็บสัญญาณงบประมาณ และ `review` เก็บข้อตรวจพบ หัวหน้าทีมเทคนิคต้องตัดสินว่าใช้ตารางเดียวได้หรือไม่ |
| `criterion` | budget, procurement | เป็นคนละเรื่อง คือการให้คะแนนลำดับความสำคัญและการประเมินข้อเสนอ |
| `delivery` | finance, projects | แต่ละโมดูลที่มี adapter มีของตนตามบท Integration |
| `hearing` | budget, procurement | เป็นคนละเรื่อง คือการชี้แจงงบประมาณและการรับฟังความเห็นต่อ TOR |
| `inbox_event` | finance, projects | แต่ละโมดูลที่รับเหตุการณ์มีของตนตามการออกแบบ |
| `number_log` | budget, finance, procurement | แต่ละโมดูลออกเลขเอกสารของตนตามการออกแบบ |
| `number_series` | budget, finance, procurement | แต่ละโมดูลออกเลขเอกสารของตนตามการออกแบบ |
| `outbox_event` | budget, finance, platform, procurement, projects, review | แต่ละโมดูลมี outbox ของตนตามการออกแบบ (ADR-0008) |
| `spending_plan` | budget, finance | เป็นคนละเรื่อง คือแผนของรายการงบประมาณและแผนของกองทุนนอกงบประมาณ |
