import _ from "lodash";
import { Context } from "../context";
import { getSheetByIndex } from "../utils";

export function checkProtectionSelectLockedOrUnLockedCells(
  ctx: Context,
  r: number,
  c: number,
  sheetIndex: string
) {
  //   const _locale = locale();
  //   const local_protection = _locale.protection;
  const sheetFile = getSheetByIndex(ctx, sheetIndex);
  if (_.isNil(sheetFile)) {
    return true;
  }

  if (_.isNil(sheetFile.config) || _.isNil(sheetFile.config.authority)) {
    return true;
  }

  const aut = sheetFile.config.authority;

  if (_.isNil(aut) || _.isNil(aut.sheet) || aut.sheet === 0) {
    return true;
  }

  const { data } = sheetFile;
  const cell = data?.[r]?.[c];

  if (cell && cell.lo === 0) {
    // lo为0的时候才是可编辑
    if (aut.selectunLockedCells === 1 || _.isNil(aut.selectunLockedCells)) {
      return true;
    }
    return false;
  }
  // locked??
  const isAllEdit = false;
  // TODO  const isAllEdit = checkProtectionLockedSqref(
  //     r,
  //     c,
  //     aut,
  //     local_protection,
  //     false
  //   ); // dont alert password model
  if (isAllEdit) {
    // unlocked
    if (aut.selectunLockedCells === 1 || _.isNil(aut.selectunLockedCells)) {
      return true;
    }
    return false;
  }
  // locked
  if (aut.selectLockedCells === 1 || _.isNil(aut.selectLockedCells)) {
    return true;
  }
  return false;
}

export function checkProtectionAllSelected(ctx: Context, sheetIndex: string) {
  const sheetFile = getSheetByIndex(ctx, sheetIndex);
  if (_.isNil(sheetFile)) {
    return true;
  }

  if (_.isNil(sheetFile.config) || _.isNil(sheetFile.config.authority)) {
    return true;
  }

  const aut = sheetFile.config.authority;

  if (_.isNil(aut) || _.isNil(aut.sheet) || aut.sheet === 0) {
    return true;
  }

  let selectunLockedCells = false;
  if (aut.selectunLockedCells === 1 || _.isNil(aut.selectunLockedCells)) {
    selectunLockedCells = true;
  }

  let selectLockedCells = false;
  if (aut.selectLockedCells === 1 || _.isNil(aut.selectLockedCells)) {
    selectLockedCells = true;
  }

  if (selectunLockedCells && selectLockedCells) {
    return true;
  }

  return false;
}
