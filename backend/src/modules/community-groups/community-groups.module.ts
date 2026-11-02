import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommunityGroup, CommunityGroupSchema } from './schemas/community-group.schema.js';
import { CommunityGroupsService } from './community-groups.service.js';
import { CommunityGroupsController } from './community-groups.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommunityGroup.name, schema: CommunityGroupSchema },
    ]),
  ],
  controllers: [CommunityGroupsController],
  providers: [CommunityGroupsService],
  exports: [CommunityGroupsService],
})
export class CommunityGroupsModule {}

