import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminService, requireKocManager } from './admin.service';
import { Public } from '../../common/guards/public.decorator';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import {
  AdminLoginDto,
  CreateCouponDto,
  UpdateCouponDto,
  CouponStatusDto,
  GrantCouponDto,
} from '../../common/dto';

// 供应商后台鉴权：类级 @Public 豁免全局 JwtAuthGuard；
// 各业务方法用 @UseGuards(AdminAuthGuard) 校验后台 JWT，
// 从 req.user 取 supplierId / role（不再依赖 x-supplier-id 头 + 's1' fallback，
// 彻底消除生产环境 Supplier 表无 's1' 导致的 GoodSupplier 外键违反）。
@Public()
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  async login(@Body() body: AdminLoginDto) {
    const data = await this.adminService.login(body.username, body.password, body.supplierId);
    return { code: 0, message: 'success', data };
  }

  // ===== Categories =====
  @Get('categories')
  @UseGuards(AdminAuthGuard)
  async getCategories() {
    return { code: 0, message: 'success', data: await this.adminService.getCategories() };
  }

  @Post('categories')
  @UseGuards(AdminAuthGuard)
  async createCategory(@Body() body: { name: string; icon?: string }) {
    return { code: 0, message: 'success', data: await this.adminService.createCategory(body) };
  }

  @Put('categories/:id')
  @UseGuards(AdminAuthGuard)
  async updateCategory(@Param('id') id: string, @Body() body: { name?: string; icon?: string; sort?: number }) {
    return { code: 0, message: 'success', data: await this.adminService.updateCategory(id, body) };
  }

  @Delete('categories/:id')
  @UseGuards(AdminAuthGuard)
  async deleteCategory(@Param('id') id: string) {
    return { code: 0, message: 'success', data: await this.adminService.deleteCategory(id) };
  }

  // Sub-categories
  @Get('subcategories')
  @UseGuards(AdminAuthGuard)
  async getSubCategories(@Query('categoryId') categoryId?: string) {
    return { code: 0, message: 'success', data: await this.adminService.getSubCategories(categoryId) };
  }

  @Post('subcategories')
  @UseGuards(AdminAuthGuard)
  async createSubCategory(@Body() body: { categoryId: string; name: string }) {
    return { code: 0, message: 'success', data: await this.adminService.createSubCategory(body) };
  }

  @Put('subcategories/:id')
  @UseGuards(AdminAuthGuard)
  async updateSubCategory(@Param('id') id: string, @Body() body: { name?: string; sort?: number }) {
    return { code: 0, message: 'success', data: await this.adminService.updateSubCategory(id, body) };
  }

  @Delete('subcategories/:id')
  @UseGuards(AdminAuthGuard)
  async deleteSubCategory(@Param('id') id: string) {
    return { code: 0, message: 'success', data: await this.adminService.deleteSubCategory(id) };
  }

  // ===== Dashboard =====
  @Get('dashboard')
  @UseGuards(AdminAuthGuard)
  async dashboard(@Req() req: Request) {
    const user = (req as any).user;
    const data = await this.adminService.getDashboard(user.supplierId, user.role);
    return { code: 0, message: 'success', data };
  }

  @Get('goods')
  @UseGuards(AdminAuthGuard)
  async getGoods(@Req() req: Request, @Query('status') status?: string) {
    const supplierId = (req as any).user.supplierId;
    const data = await this.adminService.getGoods(supplierId, status);
    return { code: 0, message: 'success', data };
  }

  @Post('goods')
  @UseGuards(AdminAuthGuard)
  async createGood(@Req() req: Request, @Body() body: any) {
    const supplierId = (req as any).user.supplierId;
    const data = await this.adminService.createGood(supplierId, body);
    return { code: 0, message: 'success', data };
  }

  @Put('goods/:id')
  @UseGuards(AdminAuthGuard)
  async updateGood(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const supplierId = (req as any).user.supplierId;
    const data = await this.adminService.updateGood(supplierId, id, body);
    return { code: 0, message: 'success', data };
  }

  @Put('goods/:id/status')
  @UseGuards(AdminAuthGuard)
  async toggleGoodStatus(@Req() req: Request, @Param('id') id: string, @Body() body: { status: string }) {
    const supplierId = (req as any).user.supplierId;
    const data = await this.adminService.updateGoodStatus(supplierId, id, body.status);
    return { code: 0, message: 'success', data };
  }

  @Delete('goods/:id')
  @UseGuards(AdminAuthGuard)
  async deleteGood(@Req() req: Request, @Param('id') id: string) {
    const supplierId = (req as any).user.supplierId;
    const data = await this.adminService.deleteGood(supplierId, id);
    return { code: 0, message: 'success', data };
  }

  @Get('orders')
  @UseGuards(AdminAuthGuard)
  async getOrders(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const supplierId = (req as any).user.supplierId;
    const data = await this.adminService.getOrders(supplierId, {
      status,
      keyword,
      startDate,
      endDate,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
    return { code: 0, message: 'success', data };
  }

  // 导出订单 CSV（全量，不分页）。必须放在 orders/:id 之前，否则 'export' 会被当成 :id
  @Get('orders/export')
  @UseGuards(AdminAuthGuard)
  async exportOrders(
    @Req() req: Request,
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const supplierId = (req as any).user.supplierId;
    const { filename, csv, count } = await this.adminService.exportOrdersCsv(supplierId, {
      status, keyword, startDate, endDate,
    });
    // 中文文件名需 RFC 5987 编码，避免乱码
    const encodedFilename = encodeURIComponent(filename);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`);
    res.send(csv);
  }

  @Get('orders/:id')
  @UseGuards(AdminAuthGuard)
  async getOrderDetail(@Req() req: Request, @Param('id') id: string) {
    const supplierId = (req as any).user.supplierId;
    const data = await this.adminService.getOrderDetail(supplierId, id);
    return { code: 0, message: 'success', data };
  }

  @Put('orders/:id/status')
  @UseGuards(AdminAuthGuard)
  async updateOrderStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { status: string; expressNo?: string; expressCompany?: string }
  ) {
    const supplierId = (req as any).user.supplierId;
    const data = await this.adminService.updateOrderStatus(supplierId, id, body);
    return { code: 0, message: 'success', data };
  }

  @Get('settlement')
  @UseGuards(AdminAuthGuard)
  async getSettlement(@Req() req: Request) {
    const supplierId = (req as any).user.supplierId;
    const data = await this.adminService.getSettlement(supplierId);
    return { code: 0, message: 'success', data };
  }

  // ===== 优惠券管理 =====

  @Get('coupons')
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
  async createCoupon(@Body() body: CreateCouponDto) {
    const data = await this.adminService.createCoupon(body);
    return { code: 0, message: 'success', data };
  }

  @Put('coupons/:id')
  @UseGuards(AdminAuthGuard)
  async updateCoupon(@Param('id') id: string, @Body() body: UpdateCouponDto) {
    const data = await this.adminService.updateCoupon(id, body);
    return { code: 0, message: 'success', data };
  }

  @Put('coupons/:id/status')
  @UseGuards(AdminAuthGuard)
  async updateCouponStatus(@Param('id') id: string, @Body() body: CouponStatusDto) {
    const data = await this.adminService.updateCouponStatus(id, body.status);
    return { code: 0, message: 'success', data };
  }

  @Post('coupons/grant')
  @UseGuards(AdminAuthGuard)
  async grantCoupon(@Body() body: GrantCouponDto) {
    const data = await this.adminService.grantCoupon(body);
    return { code: 0, message: 'success', data };
  }

  @Get('user-coupons')
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
  async getUserStats() {
    return { code: 0, message: 'success', data: await this.adminService.getUserStats() };
  }

  @Get('users/:id')
  @UseGuards(AdminAuthGuard)
  async getUserDetail(@Param('id') id: string) {
    return { code: 0, message: 'success', data: await this.adminService.getUserDetail(id) };
  }

  // ===== 客服会话管理 =====

  @Get('chat/sessions')
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
  async getChatMessages(@Param('id') id: string) {
    return { code: 0, message: 'success', data: await this.adminService.getChatMessages(id) };
  }

  @Post('chat/sessions/:id/messages')
  @UseGuards(AdminAuthGuard)
  async replyChat(@Param('id') id: string, @Body() body: { content: string }) {
    const data = await this.adminService.replyChat(id, body.content);
    return { code: 0, message: 'success', data };
  }

  @Put('chat/sessions/:id/read')
  @UseGuards(AdminAuthGuard)
  async markChatRead(@Param('id') id: string) {
    return { code: 0, message: 'success', data: await this.adminService.markChatRead(id) };
  }

  @Put('chat/sessions/:id/closed')
  @UseGuards(AdminAuthGuard)
  async toggleChatClosed(@Param('id') id: string, @Body() body: { closed: boolean }) {
    const data = await this.adminService.toggleChatClosed(id, body.closed);
    return { code: 0, message: 'success', data };
  }

  // ===== 售后 / 退货管理 =====

  @Get('aftersales')
  @UseGuards(AdminAuthGuard)
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
  @UseGuards(AdminAuthGuard)
  async getAftersaleDetail(@Param('id') id: string) {
    return { code: 0, message: 'success', data: await this.adminService.getAftersaleDetail(id) };
  }

  @Put('aftersales/:id/audit')
  @UseGuards(AdminAuthGuard)
  async auditAftersale(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; remark?: string },
  ) {
    const data = await this.adminService.auditAftersale(id, body.action, body.remark);
    return { code: 0, message: 'success', data };
  }

  @Put('aftersales/:id/refund')
  @UseGuards(AdminAuthGuard)
  async refundAftersale(
    @Param('id') id: string,
    @Body() body: { remark?: string },
  ) {
    const data = await this.adminService.refundAftersale(id, body.remark);
    return { code: 0, message: 'success', data };
  }

  // ===== KOC 管理（仅超管 role=super）=====

  @Get('koc/applications')
  @UseGuards(AdminAuthGuard)
  async getKocApplications(@Req() req: Request, @Query('status') status?: string) {
    requireKocManager((req as any).user.role);
    return { code: 0, message: 'success', data: await this.adminService.getKocApplications(status) };
  }

  @Put('koc/:id/audit')
  @UseGuards(AdminAuthGuard)
  async auditKocApplication(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; rejectReason?: string; commissionRate?: number },
  ) {
    requireKocManager((req as any).user.role);
    const data = await this.adminService.auditKocApplication(id, body.action, body.rejectReason, body.commissionRate);
    return { code: 0, message: 'success', data };
  }

  @Put('koc/:id/commission')
  @UseGuards(AdminAuthGuard)
  async updateKocCommission(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { commissionRate: number | null },
  ) {
    requireKocManager((req as any).user.role);
    const data = await this.adminService.updateKocCommission(id, body.commissionRate);
    return { code: 0, message: 'success', data };
  }

  @Put('users/:id/koc')
  @UseGuards(AdminAuthGuard)
  async toggleUserKoc(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    requireKocManager((req as any).user.role);
    const data = await this.adminService.toggleUserKoc(id, body.enabled);
    return { code: 0, message: 'success', data };
  }

  // ===== 店管家分销代发 =====
  @Get('dianjia/shops')
  @UseGuards(AdminAuthGuard)
  async getDianjiaShops() {
    return { code: 0, message: 'success', data: await this.adminService.getDianjiaShops() };
  }

  /** 手动重传订单到店管家（异步上传失败时的补偿入口）。 */
  @Post('dianjia/orders/:id/upload')
  @UseGuards(AdminAuthGuard)
  async retryUploadOrder(@Param('id') id: string) {
    const data = await this.adminService.retryUploadOrder(id);
    return { code: 0, message: 'success', data };
  }

  /** 同步单个商品到店管家。 */
  @Post('dianjia/goods/:id/sync')
  @UseGuards(AdminAuthGuard)
  async syncGood(@Param('id') id: string) {
    const data = await this.adminService.syncGoodToDianjia(id);
    return { code: 0, message: 'success', data };
  }

  /** 批量同步已支付订单到店管家。query.force=true 则全量重传。 */
  @Post('dianjia/orders/sync-all')
  @UseGuards(AdminAuthGuard)
  async syncAllOrders(@Query('force') force?: string) {
    const data = await this.adminService.syncAllOrdersToDianjia(force === 'true');
    return { code: 0, message: 'success', data };
  }

  /** 读取自动同步开关。 */
  @Get('dianjia/auto-sync')
  @UseGuards(AdminAuthGuard)
  async getDianjiaAutoSync() {
    return { code: 0, message: 'success', data: await this.adminService.getDianjiaAutoSync() };
  }

  /** 设置自动同步开关。 */
  @Put('dianjia/auto-sync')
  @UseGuards(AdminAuthGuard)
  async setDianjiaAutoSync(@Body() body: { enabled: boolean }) {
    return { code: 0, message: 'success', data: await this.adminService.setDianjiaAutoSync(body.enabled) };
  }

  /** 批量同步所有在售商品到店管家。 */
  @Post('dianjia/goods/sync-all')
  @UseGuards(AdminAuthGuard)
  async syncAllGoods() {
    const data = await this.adminService.syncAllGoodsToDianjia();
    return { code: 0, message: 'success', data };
  }

  /** 库存同步：从店管家拉厂家库存回写鲜到家。query.skuId 缺省则全量。 */
  @Post('dianjia/stock/sync')
  @UseGuards(AdminAuthGuard)
  async syncStock(@Query('skuId') skuId?: string) {
    const data = await this.adminService.syncStockToDianjia(skuId);
    return { code: 0, message: 'success', data };
  }

  // ===== 轮播图管理 =====

  @Get('banners')
  @UseGuards(AdminAuthGuard)
  async listBanners() {
    const data = await this.adminService.listBanners();
    return { code: 0, message: 'success', data };
  }

  @Post('banners')
  @UseGuards(AdminAuthGuard)
  async createBanner(@Body() body: { title: string; imageUrl: string; link?: string; sort?: number; status?: string }) {
    const data = await this.adminService.createBanner(body);
    return { code: 0, message: 'success', data };
  }

  @Put('banners/:id')
  @UseGuards(AdminAuthGuard)
  async updateBanner(
    @Param('id') id: string,
    @Body() body: { title?: string; imageUrl?: string; link?: string; sort?: number; status?: string },
  ) {
    const data = await this.adminService.updateBanner(id, body);
    return { code: 0, message: 'success', data };
  }

  @Delete('banners/:id')
  @UseGuards(AdminAuthGuard)
  async deleteBanner(@Param('id') id: string) {
    const data = await this.adminService.deleteBanner(id);
    return { code: 0, message: 'success', data };
  }
}
