-- Bỏ giai đoạn "PV nội bộ" (internal_iv) và "Đề nghị nhận việc" (offer).
-- Chuyển ứng viên đang ở 2 giai đoạn này về "PV khách hàng" (client_iv).
UPDATE "applications" SET "stage" = 'client_iv'
WHERE "stage" IN ('internal_iv', 'offer');
