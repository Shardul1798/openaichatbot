import { Test, TestingModule } from '@nestjs/testing';
import { DirectBController } from './direct-b.controller';
import { DirectBService } from './direct-b.service';

describe('DirectBController', () => {
  let controller: DirectBController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DirectBController],
      providers: [DirectBService],
    }).compile();

    controller = module.get<DirectBController>(DirectBController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
