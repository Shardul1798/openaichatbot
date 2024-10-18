import { Test, TestingModule } from '@nestjs/testing';
import { DirectBService } from './direct-b.service';

describe('DirectBService', () => {
  let service: DirectBService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DirectBService],
    }).compile();

    service = module.get<DirectBService>(DirectBService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
