import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import type { BaseContract, BytesLike, ContractTransactionResponse } from "ethers";
import { ethers, fhevm } from "hardhat";

type RangeReductionLab = BaseContract & {
  setEncryptedTotal(handle: BytesLike, proof: BytesLike): Promise<ContractTransactionResponse>;
  sampleByMultiplyHigh(): Promise<ContractTransactionResponse>;
  lastTarget(): Promise<string>;
  lastHadPositiveTotal(): Promise<string>;
};

describe("EncryptedRangeReductionLab", function () {
  beforeEach(function () {
    if (!fhevm.isMock) this.skip();
  });

  async function deploy() {
    const [deployer, alice] = await ethers.getSigners();
    if (deployer === undefined || alice === undefined) throw new Error("missing test signers");
    const factory = await ethers.getContractFactory("EncryptedRangeReductionLab", deployer);
    const lab = (await factory.deploy()) as unknown as RangeReductionLab;
    await lab.waitForDeployment();
    return { alice, lab, address: await lab.getAddress() };
  }

  async function setTotal(
    lab: Awaited<ReturnType<typeof deploy>>["lab"],
    address: string,
    signer: Awaited<ReturnType<typeof ethers.getSigners>>[number],
    total: bigint,
  ) {
    const encrypted = await fhevm
      .createEncryptedInput(address, await signer.getAddress())
      .add64(total)
      .encrypt();
    const connected = lab.connect(signer) as RangeReductionLab;
    await (await connected.setEncryptedTotal(encrypted.handles[0], encrypted.inputProof)).wait();
  }

  it("returns encrypted zero and a false guard for an empty pool", async function () {
    const { alice, lab, address } = await deploy();
    await setTotal(lab, address, alice, 0n);
    await (await (lab.connect(alice) as RangeReductionLab).sampleByMultiplyHigh()).wait();

    const target = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      await lab.lastTarget(),
      address,
      alice,
    );
    const hasPositiveTotal = await fhevm.userDecryptEbool(
      await lab.lastHadPositiveTotal(),
      address,
      alice,
    );

    expect(target).to.equal(0n);
    expect(hasPositiveTotal).to.equal(false);
  });

  it("always maps samples inside [0, encryptedTotal)", async function () {
    const { alice, lab, address } = await deploy();
    const total = 37n;
    await setTotal(lab, address, alice, total);

    for (let sample = 0; sample < 8; sample += 1) {
      await (await (lab.connect(alice) as RangeReductionLab).sampleByMultiplyHigh()).wait();
      const target = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await lab.lastTarget(),
        address,
        alice,
      );
      expect(target).to.be.at.least(0n);
      expect(target).to.be.lessThan(total);
    }
  });
});
