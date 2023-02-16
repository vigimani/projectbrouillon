# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```
            // await MyVault.setExposition(0, {
            //     value: keepersFee,
            //     gasLimit: 10000000,
            //   });
            // await executeDecreasePositions();
            // gmxPositionT3 = await getPositions(GMX_controller.address, false);
            // expect(gmxPositionT3[0].toString()).to.be.eq("0");
            // let a = await USDC.balanceOf(MyVault.address);
            // console.log(a.toString())


                        await MyVault.setExposition(1);
            console.log("USDC balance of vault :",)
            gmxPositionLong = await getPositions(GMX_controller.address, true);
            gmxPositionShort = await getPositions(GMX_controller.address, false);
            expect(gmxPositionLong[0].toString()).to.not.eq("0");
            expect(gmxPositionShort[0].toString()).to.be.eq("0");