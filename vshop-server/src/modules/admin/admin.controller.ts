import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { AdminService, requireKocManager } from './admin.service';
import { Public } from '../../common/guards/public.decorator';
import {
  AdminLoginDto,
  CreateCouponDto,
  UpdateCouponDto,
  CouponStatusDto,
  GrantCouponDto,
} from '../../common/dto';

// 供应商后台鉴权暂沿用现有 x-supplier-id 头 + admin/123456，
// 标 @Public 豁免全局 JWT Guard；后台独立 JWT 鉴权待后续单独实现。
@Public()
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  async login(@Body() body: AdminLoginDto) {
    const data = await this.adminService.login(body.username, body.password);
    return { code: 0, message: 'success', data };
  }

  // ===== Categories =====
  @Get('categories')
  async getCategories() {
    return { code: 0, message: 'success', data: await this.adminService.getCategories() };
  }

  @Post('categories')
  async createCategory(@Body() body: { name: string; icon?: string }) {
    return { code: 0, message: 'success', data: await this.adminService.createCategory(body) };
  }

  @Put('categories/:id')
  async updateCategory(@Param('id') id: string, @Body() body: { name?: string; icon?: string; sort?: number }) {
    return { code: 0, message: 'success', data: await this.adminService.updateCategory(id, body) };
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return { code: 0, message: 'success', data: await this.adminService.deleteCategory(id) };
  }

  // Sub-categories
  @Get('subcategories')
  async getSubCategories(@Query('categoryId') categoryId?: string) {
    return { code: 0, message: 'success', data: await this.adminService.getSubCategories(categoryId) };
  }

  @Post('subcategories')
  async createSubCategory(@Body() body: { categoryId: string; name: string }) {
    return { code: 0, message: 'success', data: await this.adminService.createSubCategory(body) };
  }

  @Put('subcategories/:id')
  async updateSubCategory(@Param('id') id: string, @Body() body: { name?: string; sort?: number }) {
    return { code: 0, message: 'success', data: await this.adminService.updateSubCategory(id, body) };
  }

  @Delete('subcategories/:id')
  async deleteSubCategory(@Param('id') id: string) {
    return { code: 0, message: 'success', data: await this.adminService.deleteSubCategory(id) };
  }

  // ===== Dashboard =====
  @Get('dashboard')
  async dashboard(@Req() req: Request) {
    const supplierId = (req.headers['x-supplier-id'] as string) || 's1';
    const data = await this.adminService.getDashboard(supplierId);
    return { code: 0, message: 'success', data };
  }

  @Get('goods')
  async getGoods(@Req() req: Request, @Query('status') status?: string) {
    const supplierId = (req.headers['x-supplier-id'] as string) || 's1';
    const data = await this.adminService.getGoods(supplierId, status);
    return { code: 0, message: 'success', data };
  }

  @Post('goods')
  async createGood(@Req() req: Request, @Body() body: any) {
    const supplierId = (req.headers['x-supplier-id'] as string) || 's1';
    const data = await this.adminService.createGood(supplierId, body);
    return { code: 0, message: 'success', data };
  }

  @Put('goods/:id')
  async updateGood(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const supplierId = (req.headers['x-supplier-id'] as string) || 's1';
    const data = await this.adminService.updateGood(supplierId, id, body);
    return { code: 0, message: 'success', data };
  }

  @Put('goods/:id/status')
  async toggleGoodStatus(@Req() req: Request, @Param('id') id: string, @Body() body: { status: string }) {
    const supplierId = (req.headers['x-supplier-id'] as string) || 's1';
    const data = await this.adminService.updateGoodStatus(supplierId, id, body.status);
    return { code: 0, message: 'success', data };
  }

  @Delete('goods/:id')
  async deleteGood(@Req() req: Request, @Param('id') id: string) {
    const supplierId = (req.headers['x-supplier-id'] as string) || 's1';
    const data = await this.adminService.deleteGood(supplierId, id);
    return { code: 0, message: 'success', data };
  }

  @Get('orders')
  async getOrders(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const supplierId = (req.headers['x-supplier-id'] as string) || 's1';
    const data = await this.adminService.getOrders(supplierId, {
      status,
      keyword,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
    return { code: 0, message: 'success', data };
  }

  @Get('orders/:id')
  async getOrderDetail(@Req() req: Request, @Param('id') id: string) {
    const supplierId = (req.headers['x-supplier-id'] as string) || 's1';
    const data = await this.adminService.getOrderDetail(supplierId, id);
    return { code: 0, message: 'success', data };
  }

  @Put('orders/:id/status')
  async updateOrderStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { status: string; expressNo?: string; expressCompany?: string }
  ) {
    const supplierId = (req.headers['x-supplier-id'] as string) || 's1';
    const data = await this.adminService.updateOrderStatus(supplierId, id, body);
    return { code: 0, message: 'success', data };
  }

  @Get('settlement')
  async getSettlement(@Req() req: Request) {
    const supplierId = (req.headers['x-supplier-id'] as string) || 's1';
    const data = await this.adminService.getSettlement(supplierId);
    return { code: 0, message: 'success', data };
  }

  // ===== 优惠券管理 =====

  @Get('coupons')
  async listCoupons(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.adminService.listCoupons({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      status,
    });
    return { code: 0, message: 'success', data };
  }

  @Post('coupons')
  async createCoupon(@Body() body: CreateCouponDto) {
    const data = await this.adminService.createCoupon(body);
    return { code: 0, message: 'success', data };
  }

  @Put('coupons/:id')
  async updateCoupon(@Param('id') id: string, @Body() body: UpdateCouponDto) {
    const data = await this.adminService.updateCoupon(id, body);
    return { code: 0, message: 'success', data };
  }

  @Put('coupons/:id/status')
  async updateCouponStatus(@Param('id') id: string, @Body() body: CouponStatusDto) {
    const data = await this.adminService.updateCouponStatus(id, body.status);
    return { code: 0, message: 'success', data };
  }

  @Post('coupons/grant')
  async grantCoupon(@Body() body: GrantCouponDto) {
    const data = await this.adminService.grantCoupon(body);
    return { code: 0, message: 'success', data };
  }

  @Get('user-coupons')
  async listUserCoupons(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('couponId') couponId?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.adminService.listUserCoupons({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      couponId,
      status,
    });
    return { code: 0, message: 'success', data };
  }

  // ===== 客户管理 =====

  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.adminService.getUsers({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      keyword,
      status,
    });
    return { code: 0, message: 'success', data };
  }

  @Get('users/stats')
  async getUserStats() {
    return { code: 0, message: 'success', data: await this.adminService.getUserStats() };
  }

  @Get('users/:id')
  async getUserDetail(@Param('id') id: string) {
    return { code: 0, message: 'success', data: await this.adminService.getUserDetail(id) };
  }

  // ===== 客服会话管理 =====

  @Get('chat/sessions')
  async getChatSessions(
    @Query('keyword') keyword?: string,
    @Query('closed') closed?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const data = await this.adminService.getChatSessions({
      keyword,
      closed,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 50,
    });
    return { code: 0, message: 'success', data };
  }

  @Get('chat/sessions/:id/messages')
  async getChatMessages(@Param('id') id: string) {
    return { code: 0, message: 'success', data: await this.adminService.getChatMessages(id) };
  }

  @Post('chat/sessions/:id/messages')
  async replyChat(@Param('id') id: string, @Body() body: { content: string }) {
    const data = await this.adminService.replyChat(id, body.content);
    return { code: 0, message: 'success', data };
  }

  @Put('chat/sessions/:id/read')
  async markChatRead(@Param('id') id: string) {
    return { code: 0, message: 'success', data: await this.adminService.markChatRead(id) };
  }

  @Put('chat/sessions/:id/closed')
  async toggleChatClosed(@Param('id') id: string, @Body() body: { closed: boolean }) {
    const data = await this.adminService.toggleChatClosed(id, body.closed);
    return { code: 0, message: 'success', data };
  }

  // ===== 售后 / 退货管理 =====

  @Get('aftersales')
  async listAftersales(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const data = await this.adminService.listAftersales({
      status,
      type,
      keyword,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
    return { code: 0, message: 'success', data };
  }

  @Get('aftersales/:id')
  async getAftersaleDetail(@Param('id') id: string) {
    return { code: 0, message: 'success', data: await this.adminService.getAftersaleDetail(id) };
  }

  @Put('aftersales/:id/audit')
  async auditAftersale(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; remark?: string },
  ) {
    const data = await this.adminService.auditAftersale(id, body.action, body.remark);
    return { code: 0, message: 'success', data };
  }

  @Put('aftersales/:id/refund')
  async refundAftersale(
    @Param('id') id: string,
    @Body() body: { remark?: string },
  ) {
    const data = await this.adminService.refundAftersale(id, body.remark);
    return { code: 0, message: 'success', data };
  }

  // ===== KOC 管理（仅超管 x-admin-role=super）=====

  @Get('koc/applications')
  async getKocApplications(@Req() req: Request, @Query('status') status?: string) {
    requireKocManager(req.headers['x-admin-role'] as string);
    return { code: 0, message: 'success', data: await this.adminService.getKocApplications(status) };
  }

  @Put('koc/:id/audit')
  async auditKocApplication(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; rejectReason?: string; commissionRate?: number },
  ) {
    requireKocManager(req.headers['x-admin-role'] as string);
    const data = await this.adminService.auditKocApplication(id, body.action, body.rejectReason, body.commissionRate);
    return { code: 0, message: 'success', data };
  }

  @Put('koc/:id/commission')
  async updateKocCommission(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { commissionRate: number | null },
  ) {
    requireKocManager(req.headers['x-admin-role'] as string);
    const data = await this.adminService.updateKocCommission(id, body.commissionRate);
    return { code: 0, message: 'success', data };
  }

  @Put('users/:id/koc')
  async toggleUserKoc(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    requireKocManager(req.headers['x-admin-role'] as string);
    const data = await this.adminService.toggleUserKoc(id, body.enabled);
    return { code: 0, message: 'success', data };
  }

  // ===== 店管家分销代发 =====
  @Get('dianjia/shops')
  async getDianjiaShops() {
    return { code: 0, message: 'success', data: await this.adminService.getDianjiaShops() };
  }

  /** 手动重传订单到店管家（异步上传失败时的补偿入口）。 */
  @Post('dianjia/orders/:id/upload')
  async retryUploadOrder(@Param('id') id: string) {
    const data = await this.adminService.retryUploadOrder(id);
    return { code: 0, message: 'success', data };
  }

  /** 同步单个商品到店管家。 */
  @Post('dianjia/goods/:id/sync')
  async syncGood(@Param('id') id: string) {
    const data = await this.adminService.syncGoodToDianjia(id);
    return { code: 0, message: 'success', data };
  }

  /** 批量同步已支付订单到店管家。query.force=true 则全量重传。 */
  @Post('dianjia/orders/sync-all')
  async syncAllOrders(@Query('force') force?: string) {
    const data = await this.adminService.syncAllOrdersToDianjia(force === 'true');
    return { code: 0, message: 'success', data };
  }

  /** 读取自动同步开关。 */
  @Get('dianjia/auto-sync')
  async getDianjiaAutoSync() {
    return { code: 0, message: 'success', data: await this.adminService.getDianjiaAutoSync() };
  }

  /** 设置自动同步开关。 */
  @Put('dianjia/auto-sync')
  async setDianjiaAutoSync(@Body() body: { enabled: boolean }) {
    return { code: 0, message: 'success', data: await this.adminService.setDianjiaAutoSync(body.enabled) };
  }

  /** 批量同步所有在售商品到店管家。 */
  @Post('dianjia/goods/sync-all')
  async syncAllGoods() {
    const data = await this.adminService.syncAllGoodsToDianjia();
    return { code: 0, message: 'success', data };
  }

  /** 库存同步：从店管家拉厂家库存回写鲜到家。query.skuId 缺省则全量。 */
  @Post('dianjia/stock/sync')
  async syncStock(@Query('skuId') skuId?: string) {
    const data = await this.adminService.syncStockToDianjia(skuId);
    return { code: 0, message: 'success', data };
  }
}
