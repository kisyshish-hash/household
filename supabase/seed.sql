-- 가족 구성원 샘플 데이터
insert into members (name, role, preferred_tasks, disliked_tasks, weekly_capacity) values
  ('김민준', '남편', array['분리수거', '장보기', '청소기 돌리기'], array['욕실 청소', '빨래 개기'], 5),
  ('이지은', '아내', array['빨래 돌리기', '냉장고 정리', '침구 정리'], array['분리수거', '음식물 쓰레기 버리기'], 5);

-- 집안일 샘플 데이터
insert into house_tasks (name, description, frequency, preferred_day, difficulty, estimated_minutes, required_people) values
  ('분리수거', '종이, 플라스틱, 유리, 캔 분리 배출', 'weekly', '월요일', 2, 20, 1),
  ('음식물 쓰레기 버리기', '음식물 쓰레기 봉투 교체 및 배출', 'weekly', '수요일', 1, 5, 1),
  ('빨래 돌리기', '세탁기에 빨래 넣고 돌리기', 'weekly', '토요일', 1, 10, 1),
  ('빨래 개기', '건조된 빨래를 개어 정리하기', 'weekly', '일요일', 2, 30, 2),
  ('청소기 돌리기', '거실, 방, 부엌 청소기 청소', 'weekly', '토요일', 2, 30, 1),
  ('욕실 청소', '욕조, 세면대, 변기 청소', 'weekly', '일요일', 3, 40, 1),
  ('침구 정리', '이불 정리 및 시트 교체', 'biweekly', '일요일', 2, 20, 2),
  ('냉장고 정리', '유통기한 확인 및 정리', 'weekly', '금요일', 2, 20, 1),
  ('장보기', '주간 식재료 및 생필품 구매', 'weekly', '토요일', 2, 60, 2),
  ('식기세척기 정리', '식기세척기 완료 후 그릇 정리', 'daily', '화요일', 1, 10, 1);
