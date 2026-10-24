import { z } from 'zod';

/*
 * 컴퓨터활용능력 출제기준 버전 (CARD-03A, docs/CURRICULUM.md 출제기준 버전 관리).
 * standard: 특정 개정에 묶이지 않는 공통 내용
 * 2024-2026: MS Office 2021 LTSC 기준
 * 2027-2029: Windows 11 환경과 AI 기본 개념 필기 도입 개편 반영
 * 튜토리얼·모듈·문제(CARD-04A) 스키마가 같은 enum을 쓴다.
 */
export const EXAM_VERSIONS = ['standard', '2024-2026', '2027-2029'] as const;

export const ExamVersionSchema = z.enum(EXAM_VERSIONS);

export type ExamVersion = z.infer<typeof ExamVersionSchema>;
